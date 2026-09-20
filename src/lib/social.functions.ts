import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Is the posting service configured for this workspace? */
export const socialStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { uploadPostKey } = await import("@/lib/social/upload-post.server");
    return { configured: !!uploadPostKey() };
  });

/** Connected TikTok accounts for the signed-in user, straight from our table. */
export const listSocialAccountsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("social_accounts")
      .select("id, account_handle, display_name, avatar_url, status, profile_identifier, created_at")
      .eq("platform", "tiktok")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { accounts: data ?? [] };
  });

/** Creates a fresh Upload-Post profile and returns its one-tap connect URL. */
export const startTikTokConnectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { createProfile, connectUrlForProfile, newProfileName } = await import(
      "@/lib/social/upload-post.server"
    );
    const request = getRequest();
    const url = new URL(request!.url);
    const forwarded = url.hostname === "localhost" ? request!.headers.get("x-forwarded-host") : null;
    const origin = forwarded ? `https://${forwarded}` : url.origin;
    const redirectUrl = new URL("/oauth/upload-post/return", origin).toString();

    const profile = newProfileName(context.userId);
    await createProfile(profile);
    const connectUrl = await connectUrlForProfile(profile, redirectUrl);
    return { connectUrl, profile };
  });

/** Reads profiles back from Upload-Post and mirrors the TikTok ones into our table. */
export const syncSocialAccountsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listProfiles, profilePrefix, tiktokAccount } = await import("@/lib/social/upload-post.server");
    const prefix = profilePrefix(context.userId);
    const mine = (await listProfiles()).filter((p) => p.username?.startsWith(prefix));

    const rows = mine
      .map((p) => ({ profile: p.username, account: tiktokAccount(p) }))
      .filter((r) => r.account)
      .map((r) => ({
        user_id: context.userId,
        platform: "tiktok",
        profile_identifier: r.profile,
        account_handle: r.account!.handle ?? r.account!.username ?? "",
        display_name: r.account!.display_name ?? null,
        avatar_url: r.account!.social_images ?? null,
        status: r.account!.reauth_required ? "needs_reconnect" : "connected",
        last_synced_at: new Date().toISOString(),
      }));

    if (rows.length) {
      const { error } = await context.supabase
        .from("social_accounts")
        .upsert(rows, { onConflict: "user_id,platform,profile_identifier" });
      if (error) throw new Error(error.message);
    }

    // Drop rows whose Upload-Post profile no longer has a TikTok account attached.
    const keep = rows.map((r) => r.profile_identifier);
    const { data: existing } = await context.supabase
      .from("social_accounts")
      .select("id, profile_identifier")
      .eq("platform", "tiktok");
    const stale = (existing ?? []).filter((e) => !keep.includes(e.profile_identifier)).map((e) => e.id);
    if (stale.length) await context.supabase.from("social_accounts").delete().in("id", stale);

    return { synced: rows.length };
  });

/** Removes the account here and the matching Upload-Post profile. */
export const disconnectSocialAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("social_accounts")
      .select("id, profile_identifier")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Account not found.");

    const { deleteProfile } = await import("@/lib/social/upload-post.server");
    try {
      await deleteProfile(row.profile_identifier);
    } catch (e) {
      console.error("[upload-post] profile delete failed", e);
    }
    await context.supabase.from("social_accounts").delete().eq("id", row.id);
    return { ok: true };
  });
