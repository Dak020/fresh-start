ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS driver text NOT NULL DEFAULT 'upload_post',
  ADD COLUMN IF NOT EXISTS open_id text,
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS scopes text;

COMMENT ON COLUMN public.social_accounts.driver IS 'Which posting engine owns this account: upload_post or tiktok (direct Content Posting API).';