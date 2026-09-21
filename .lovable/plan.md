# Caption Library (Task 2)

Build a reusable Caption Library the user can manage in Settings and pick from in 1 tap when scheduling a TikTok post (Task 3 will consume it).

## Current state
- `captions_library` table already exists (title, body, hashtags array, category, is_favorite, timestamps) with owner-scoped RLS and grants — **no migration needed**.
- Settings page already hosts the TikTok Accounts card; Caption Library becomes a sibling card following the same patterns (server fns + TanStack Query + panel styling).

## What to build

### 1. Server functions — `src/lib/captions.functions.ts`
Authenticated CRUD via `createServerFn` with `requireSupabaseAuth`, all scoped to the signed-in user:
- `listCaptionsFn` — all templates, favorites first, newest first.
- `createCaptionFn` — title, body, hashtags, category.
- `updateCaptionFn` — edit any field, toggle favorite.
- `deleteCaptionFn`.

### 2. Caption Library card — `src/components/CaptionLibrarySettings.tsx`
Added to Settings next to the TikTok Accounts card:
- List of saved captions with title, body preview, category badge, favorite star toggle, edit and delete actions.
- "New caption" dialog: title, body (with hint that `{hook}` gets replaced by the video's hook at scheduling time), category (free text with quick picks e.g. Product, Value, Story, Offer), hashtag entry (comma or space separated, auto-prefixed with `#`).
- Edit reuses the same dialog; favorite toggles inline.
- Empty state explaining what captions are for.

### 3. Wire-in
- Mount `<CaptionLibrarySettings />` in `src/routes/_authenticated/settings.tsx`.
- Unique head metadata already present on the route — unchanged.

## Out of scope (later tasks)
- The "Schedule to TikTok" modal that picks a caption (Task 3), queue/history view (Task 4), and any changes to the rendering engine, Studio, or DNA solver.

## Verification
- Typecheck clean.
- Playwright: open Settings signed in, create a caption, confirm it appears, toggle favorite, edit, delete — no console errors.
