# Task 3: Schedule-to-TikTok Modal

Task 1 (TikTok account connection) and Task 2 (Caption Library) are done. This plan adds the approval → scheduling step: from any finished render, pick a connected TikTok account, a post date/time, and a caption, and save it as a scheduled post. Dispatching posts to Upload-Post and the queue/history dashboard remain Task 4 and are NOT part of this plan.

## Scope

- Add a "Schedule" action to finished video cards (where the Download button already lives).
- New dialog: target account, date/time, caption.
- Store the schedule in the existing `scheduled_posts` table (status `scheduled`). No posting happens yet.

## Changes

### 1. Server functions — `src/lib/schedule.functions.ts` (new)

- `listScheduleOptionsFn` (authenticated): returns the user's connected TikTok accounts (from `social_accounts`) and caption templates (from `captions_library`) in one call, so the dialog can open with a single fetch.
- `createScheduledPostFn` (authenticated, POST): validates that the target video belongs to the caller, has a rendered output, the account belongs to the caller and is `connected`, and `scheduled_for` is in the future. Builds the final caption by replacing `{hook}` in the template with the video's `hook_text` (and appends the template's hashtags), then inserts a `scheduled_posts` row with `generated_video_id`, `project_id`, `social_account_id`, `caption`, `scheduled_for`, `status: "scheduled"`.

### 2. Dialog component — `src/components/ScheduleTikTokDialog.tsx` (new)

- Account dropdown showing handle + avatar; if no accounts are connected, shows a "Connect a TikTok account first" state linking to the Accounts tab.
- Date/time picker defaulting to tomorrow ~morning, rejecting past times.
- Caption picker: "Blank caption" or pick a saved template; live preview of the final caption with `{hook}` replaced by the video's hook text; editable before submitting.
- Reuses the existing dialog/toast patterns from `CaptionLibrarySettings.tsx`.

### 3. Wire the button

- `src/routes/_authenticated/projects.$projectId.tsx`: add a "Schedule" button next to Download on each completed video card, opening the dialog with that video's id, hook text, and project id.
- `src/routes/_authenticated/studio.tsx`: same button on Studio result cards (UI addition only — no changes to the render engine or DNA solver).

## Constraints honored

- No changes to the render engine, DNA solver, or posting service (`upload-post.server.ts` untouched).
- One task at a time; nothing posts to TikTok in this task — rows are created for Task 4 to dispatch.

## Verification

- `bunx tsgo --noEmit` passes.
- Playwright against the preview: sign in, open a project with a finished render, click Schedule, confirm the dialog validates (past time rejected, no-account state shown) and a successful submit creates a `scheduled_posts` row visible in the database.
