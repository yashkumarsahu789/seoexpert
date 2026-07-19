-- User folder workflows with per-folder API keys

CREATE TABLE IF NOT EXISTS public.workflow_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_folders_slug ON public.workflow_folders (slug);

CREATE TABLE IF NOT EXISTS public.folder_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.workflow_folders(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Default',
  provider text NOT NULL DEFAULT 'custom',
  api_key text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_folder_api_keys_folder ON public.folder_api_keys (folder_id, is_active);

CREATE TABLE IF NOT EXISTS public.folder_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.workflow_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  user_prompt text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  generation_stage text NOT NULL DEFAULT 'idle',
  generation_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  spec_json jsonb,
  ui_schema jsonb,
  error_message text,
  n8n_workflow_id text,
  webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_folder_workflows_folder ON public.folder_workflows (folder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.folder_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.folder_workflows(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'action',
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  prompt text,
  ai_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_folder_workflow_steps_workflow ON public.folder_workflow_steps (workflow_id, step_order);

CREATE TABLE IF NOT EXISTS public.folder_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.folder_workflows(id) ON DELETE CASCADE,
  input_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_json jsonb,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_folder_workflow_runs_workflow ON public.folder_workflow_runs (workflow_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_folder_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workflow_folders_updated_at ON public.workflow_folders;
CREATE TRIGGER workflow_folders_updated_at
  BEFORE UPDATE ON public.workflow_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_folder_updated_at();

DROP TRIGGER IF EXISTS folder_api_keys_updated_at ON public.folder_api_keys;
CREATE TRIGGER folder_api_keys_updated_at
  BEFORE UPDATE ON public.folder_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_folder_updated_at();

DROP TRIGGER IF EXISTS folder_workflows_updated_at ON public.folder_workflows;
CREATE TRIGGER folder_workflows_updated_at
  BEFORE UPDATE ON public.folder_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_folder_updated_at();

DROP TRIGGER IF EXISTS folder_workflow_steps_updated_at ON public.folder_workflow_steps;
CREATE TRIGGER folder_workflow_steps_updated_at
  BEFORE UPDATE ON public.folder_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_folder_updated_at();

ALTER TABLE public.workflow_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_workflow_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_folders' AND policyname = 'workflow_folders_anon') THEN
    CREATE POLICY workflow_folders_anon ON public.workflow_folders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folder_api_keys' AND policyname = 'folder_api_keys_anon') THEN
    CREATE POLICY folder_api_keys_anon ON public.folder_api_keys FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folder_workflows' AND policyname = 'folder_workflows_anon') THEN
    CREATE POLICY folder_workflows_anon ON public.folder_workflows FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folder_workflow_steps' AND policyname = 'folder_workflow_steps_anon') THEN
    CREATE POLICY folder_workflow_steps_anon ON public.folder_workflow_steps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folder_workflow_runs' AND policyname = 'folder_workflow_runs_anon') THEN
    CREATE POLICY folder_workflow_runs_anon ON public.folder_workflow_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
