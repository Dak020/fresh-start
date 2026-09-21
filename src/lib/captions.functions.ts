import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CaptionInput = {
  title: string;
  body: string;
  hashtags: string[];
  category: string;
};

/** All caption templates for the signed-in user — favorites first, newest first. */
export const listCaptionsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("captions_library")
      .select("id, title, body, hashtags, category, is_favorite, created_at")
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { captions: data ?? [] };
  });

export const createCaptionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CaptionInput) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("captions_library").insert({
      user_id: context.userId,
      title: data.title,
      body: data.body,
      hashtags: data.hashtags,
      category: data.category,
      is_favorite: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCaptionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      title?: string;
      body?: string;
      hashtags?: string[];
      category?: string;
      is_favorite?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const patch: {
      title?: string;
      body?: string;
      hashtags?: string[];
      category?: string;
      is_favorite?: boolean;
    } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.body !== undefined) patch.body = data.body;
    if (data.hashtags !== undefined) patch.hashtags = data.hashtags;
    if (data.category !== undefined) patch.category = data.category;
    if (data.is_favorite !== undefined) patch.is_favorite = data.is_favorite;

    const { error } = await context.supabase
      .from("captions_library")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCaptionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("captions_library")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
