CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'tiktok',
  status text NOT NULL DEFAULT 'draft',
  content_style text NOT NULL DEFAULT 'ugc',
  target_age text,
  target_gender text,
  target_location text,
  target_interests text[] NOT NULL DEFAULT '{}',
  videos_to_generate integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products" ON public.products FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  structure text,
  emotional_trigger text,
  audience text,
  platform text NOT NULL DEFAULT 'tiktok',
  source text NOT NULL DEFAULT 'manual',
  notes text,
  is_winner boolean NOT NULL DEFAULT false,
  performance_score numeric NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  retention numeric NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hooks TO authenticated;
GRANT ALL ON public.hooks TO service_role;
ALTER TABLE public.hooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hooks" ON public.hooks FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER hooks_updated_at BEFORE UPDATE ON public.hooks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hook_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_hook_id uuid REFERENCES public.hooks(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text,
  structure text,
  emotional_trigger text,
  rationale text,
  score numeric NOT NULL DEFAULT 0,
  saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hook_variants TO authenticated;
GRANT ALL ON public.hook_variants TO service_role;
ALTER TABLE public.hook_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hook variants" ON public.hook_variants FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_url text,
  thumbnail_url text,
  duration numeric,
  width integer,
  height integer,
  size_bytes bigint,
  category text NOT NULL DEFAULT 'b-roll',
  hook_placement text NOT NULL DEFAULT 'any',
  tags text[] NOT NULL DEFAULT '{}',
  dna_role text CHECK (dna_role IS NULL OR dna_role IN ('start','middle','end')),
  allowed_speeds numeric[] NOT NULL DEFAULT '{1.0,1.5,1.7,2.0}'::numeric[],
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own media assets" ON public.media_assets FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.video_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  hook_id uuid REFERENCES public.hooks(id) ON DELETE SET NULL,
  media_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  overlay_text text NOT NULL DEFAULT '',
  overlay_position text NOT NULL DEFAULT 'top',
  text_color text NOT NULL DEFAULT '#ffffff',
  background_color text NOT NULL DEFAULT '#000000',
  font_size integer NOT NULL DEFAULT 64,
  duration numeric NOT NULL DEFAULT 8,
  width integer NOT NULL DEFAULT 1080,
  height integer NOT NULL DEFAULT 1920,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_recipes TO authenticated;
GRANT ALL ON public.video_recipes TO service_role;
ALTER TABLE public.video_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own video recipes" ON public.video_recipes FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.video_recipes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  progress numeric NOT NULL DEFAULT 0,
  output_url text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.render_jobs TO authenticated;
GRANT ALL ON public.render_jobs TO service_role;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own render jobs" ON public.render_jobs FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.generated_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  hook_id uuid REFERENCES public.hooks(id) ON DELETE SET NULL,
  media_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  recipe_id uuid REFERENCES public.video_recipes(id) ON DELETE SET NULL,
  render_job_id uuid REFERENCES public.render_jobs(id) ON DELETE SET NULL,
  hook_text text,
  output_url text,
  thumbnail_url text,
  duration numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ready',
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_videos TO authenticated;
GRANT ALL ON public.generated_videos TO service_role;
ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own generated videos" ON public.generated_videos FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hook_id uuid REFERENCES public.hooks(id) ON DELETE CASCADE,
  generated_video_id uuid REFERENCES public.generated_videos(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'tiktok',
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  avg_watch_time numeric NOT NULL DEFAULT 0,
  completion_rate numeric NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_metrics TO authenticated;
GRANT ALL ON public.performance_metrics TO service_role;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own performance metrics" ON public.performance_metrics FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.dna_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_duration numeric NOT NULL DEFAULT 8,
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  hook_id uuid REFERENCES public.hooks(id) ON DELETE SET NULL,
  hook_placement text NOT NULL DEFAULT 'top',
  final_duration numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dna_recipes TO authenticated;
GRANT ALL ON public.dna_recipes TO service_role;
ALTER TABLE public.dna_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dna recipes" ON public.dna_recipes FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.render_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.generated_videos(id) ON DELETE CASCADE,
  project_id uuid,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  reason text,
  issues text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.render_feedback TO authenticated;
GRANT ALL ON public.render_feedback TO service_role;
ALTER TABLE public.render_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own render feedback" ON public.render_feedback FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER render_feedback_updated_at BEFORE UPDATE ON public.render_feedback
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'My LLM',
  base_url text NOT NULL,
  model text NOT NULL,
  api_key text NOT NULL,
  key_hint text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_credentials TO authenticated;
GRANT ALL ON public.ai_credentials TO service_role;
ALTER TABLE public.ai_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai credentials" ON public.ai_credentials FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX ai_credentials_one_active_per_user ON public.ai_credentials (user_id) WHERE is_active;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ai_credentials_updated_at BEFORE UPDATE ON public.ai_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "own media files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "own render files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1]);