CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'tiktok',
  account_handle text NOT NULL DEFAULT '',
  display_name text,
  avatar_url text,
  profile_identifier text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, profile_identifier)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_accounts TO authenticated;
GRANT ALL ON public.social_accounts TO service_role;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own social accounts" ON public.social_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER social_accounts_updated_at BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.captions_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled caption',
  body text NOT NULL DEFAULT '',
  hashtags text[] NOT NULL DEFAULT '{}'::text[],
  category text NOT NULL DEFAULT 'general',
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.captions_library TO authenticated;
GRANT ALL ON public.captions_library TO service_role;
ALTER TABLE public.captions_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own captions" ON public.captions_library FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER captions_library_updated_at BEFORE UPDATE ON public.captions_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_video_id uuid REFERENCES public.generated_videos(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  caption text NOT NULL DEFAULT '',
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'scheduled',
  upload_post_job_id text,
  post_url text,
  error_message text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scheduled posts" ON public.scheduled_posts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER scheduled_posts_updated_at BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX scheduled_posts_due_idx ON public.scheduled_posts (status, scheduled_for);