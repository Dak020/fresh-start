# Task 1 — TikTok accounts + posting foundations

Scope: database groundwork for auto-posting, plus a **TikTok Accounts** section in Settings where you connect one or more TikTok accounts through Upload-Post's hosted one-tap page. Nothing in rendering, Studio or the DNA solver is touched.

## What you'll be able to do

- Open Settings and see a new "TikTok Accounts" card.
- Tap "Connect TikTok account" — Upload-Post's hosted page opens in a small window, you log in to TikTok, and the account appears in the list with its handle and avatar.
- Connect several accounts and see each one's status (connected / needs reconnecting).
- Remove an account you no longer post to.

Until the Upload-Post key is saved, the card shows a clear "Posting service not set up yet" state with the Connect button disabled, and the rest of the app is unaffected.

## Data stored

Three tables, each private to your account (row-level security, owner-only access):

- **social_accounts** — one row per connected TikTok account: platform, handle, avatar, the Upload-Post profile identifier, status, timestamps.
- **captions_library** — reusable caption templates with a `{hook}` placeholder: title, body, tags/hashtags, timestamps. Created now so Task 2 is pure UI.
- **scheduled_posts** — links a finished video to an account: video id, account id, caption, scheduled time, status (scheduled / posting / published / failed / cancelled), Upload-Post job id, error message. Created now so Tasks 3 and 4 only add UI and dispatch.

## Technical notes

- Migration adds the three tables with `GRANT` + RLS policies scoped to `auth.uid()`, plus `updated_at` triggers matching existing tables. Foreign keys: `scheduled_posts.generated_video_id -> generated_videos.id` (cascade), `scheduled_posts.social_account_id -> social_accounts.id`.
- Upload-Post integration lives entirely server-side in new files (`src/lib/social.functions.ts` + `src/lib/social/upload-post.server.ts`). The API key is read from a secret, `UPLOAD_POST_API_KEY`, inside handlers only — never in browser code.
- Connect flow: an authenticated server function calls Upload-Post's JWT/profile endpoint to mint a white-label connect URL with a return URL back to the app; the browser opens it in a popup. A small return route posts completion to the opener, which calls a second server function that reads the profile back from Upload-Post and upserts the `social_accounts` row.
- Account list, refresh and delete are authenticated server functions using `requireSupabaseAuth`; the UI reads them with TanStack Query.
- New component `src/components/TikTokAccountsSettings.tsx`, rendered in `src/routes/_authenticated/settings.tsx` alongside the existing cards.

## After approval

I'll ask you to save the Upload-Post API key securely (from your Upload-Post dashboard, Settings → API keys). Without it the section renders in its setup-needed state; everything else still ships.

## Out of scope for this task

Caption Library UI, the "Schedule to TikTok" modal, the /queue view, and background dispatch — Tasks 2 to 4.
