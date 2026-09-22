import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Connected TikTok accounts + caption templates, fetched together for the schedule dialog. */
export const listScheduleOptionsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [accounts, captions] = await Promise.all([
      context.supabase
        .from("social_accounts")
        .select("id, account_handle, display_name, avatar_url, status")
        .eq("platform", "tiktok")
        .eq("status", "connected")
        .order("created_at", { ascending: true }),
      context.supabase
        .from("captions_library")
        .select("id, title, body, hashtags, is_favorite")
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    if (accounts.error) throw new Error(accounts.error.message);
    if (captions.error) throw new Error(captions.error.message);
    return { accounts: accounts.data ?? [], captions: captions.data ?? [] };
  });

export type ScheduleInput = {
  videoId: string;
  socialAccountId: string;
  /** A caption-library template id. When set, `caption` is ignored. */
  captionId?: string | null;
  /** Free-text caption (or fallback when no template is picked). */
  caption?: string | null;
  /** ISO timestamp — must be in the future. */
  scheduledFor: string;
};

export const createScheduledPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ScheduleInput) => input)
  .handler(async ({ data, context }) => {
    const videoRes = await context.supabase
      .from("generated_videos")
      .select("id, user_id, project_id, hook_text, output_url")
      .eq("id", data.videoId)
      .maybeSingle();
    if (videoRes.error) throw new Error(videoRes.error.message);
    const video = videoRes.data;
    if (!video || video.user_id !== context.userId) throw new Error("Video not found.");
    if (!video.output_url) throw new Error("This video has no rendered output to post.");

    const acctRes = await context.supabase
      .from("social_accounts")
      .select("id, user_id, status, account_handle")
      .eq("id", data.socialAccountId)
      .eq("platform", "tiktok")
      .maybeSingle();
    if (acctRes.error) throw new Error(acctRes.error.message);
    const account = acctRes.data;
    if (!account || account.user_id !== context.userId) throw new Error("Account not found.");
    if (account.status !== "connected") {
      throw new Error(`@${account.account_handle} is not connected. Reconnect it on the Accounts page.`);
    }

    const scheduledFor = new Date(data.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) throw new Error("Pick a valid date and time.");
    if (scheduledFor.getTime() <= Date.now()) throw new Error("Pick a date and time in the future.");

    // Build the final caption: template with {hook} swapped for the video's hook,
    // hashtags appended — or the free-text caption when no template is picked.
    const hookText = video.hook_text ?? "";
    let caption = "";
    if (data.captionId) {
      const capRes = await context.supabase
        .from("captions_library")
        .select("id, user_id, body, hashtags")
        .eq("id", data.captionId)
        .maybeSingle();
      if (capRes.error) throw new Error(capRes.error.message);
      const template = capRes.data;
      if (!template || template.user_id !== context.userId) throw new Error("Caption template not found.");
      caption = template.body.split("{hook}").join(hookText);
      if (template.hashtags?.length) {
        caption += `\n\n${template.hashtags.map((h: string) => `#${h}`).join(" ")}`;
      }
    } else if (data.caption && data.caption.trim()) {
      caption = data.caption.split("{hook}").join(hookText);
    }
    caption = caption.trim();
    if (!caption) throw new Error("Write a caption or pick a template.");
    if (caption.length > 2200) throw new Error("Caption is too long (TikTok allows 2200 characters).");

    const insRes = await context.supabase
      .from("scheduled_posts")
      .insert({
        user_id: context.userId,
        generated_video_id: video.id,
        project_id: video.project_id,
        social_account_id: account.id,
        caption,
        scheduled_for: scheduledFor.toISOString(),
        status: "scheduled",
      })
      .select("id")
      .single();
    if (insRes.error) throw new Error(insRes.error.message);
    return { id: insRes.data.id };
  });
