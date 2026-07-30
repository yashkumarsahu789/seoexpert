-- /temp AI — automation boxes + run history + model usage (Supabase)

CREATE TABLE IF NOT EXISTS public.temp_automation_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '📦',
  accent text NOT NULL DEFAULT '#6366f1',
  path text NOT NULL,
  kind text NOT NULL DEFAULT 'automation',
  task_type text NOT NULL DEFAULT 'general',
  is_primary boolean NOT NULL DEFAULT false,
  config_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.temp_ai_runs (
  id bigserial PRIMARY KEY,
  box_id uuid REFERENCES public.temp_automation_boxes(id) ON DELETE SET NULL,
  task_type text NOT NULL DEFAULT 'general',
  prompt text NOT NULL,
  model_id text,
  key_slot text,
  response_text text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'waiting', 'processing', 'completed', 'failed')),
  error_message text,
  meta_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.temp_model_usage (
  model_id text NOT NULL,
  usage_date date NOT NULL DEFAULT (timezone('UTC', now()))::date,
  calls_used integer NOT NULL DEFAULT 0 CHECK (calls_used >= 0),
  PRIMARY KEY (model_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_temp_ai_runs_created ON public.temp_ai_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_temp_ai_runs_box ON public.temp_ai_runs (box_id);

CREATE OR REPLACE FUNCTION public.set_temp_boxes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS temp_automation_boxes_updated_at ON public.temp_automation_boxes;
CREATE TRIGGER temp_automation_boxes_updated_at
  BEFORE UPDATE ON public.temp_automation_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_temp_boxes_updated_at();

ALTER TABLE public.temp_automation_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_model_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY temp_boxes_anon_all ON public.temp_automation_boxes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY temp_runs_anon_all ON public.temp_ai_runs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY temp_usage_anon_all ON public.temp_model_usage
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.temp_automation_boxes (slug, name, description, icon, accent, path, kind, task_type, is_primary)
VALUES
  (
    'models-limits',
    'AI models and limits',
    'Google AI Studio catalog — models, kaam, RPM/RPD limits',
    '📋',
    '#0ea5e9',
    '/temp/models',
    'catalog',
    'general',
    true
  ),
  (
    'ai-loop-demo',
    'AI Task Runner',
    'Task → auto model assign · busy/limit pe wait · 3 locked keys',
    '🔁',
    '#f59e0b',
    '/temp/run',
    'runner',
    'general',
    false
  )
ON CONFLICT (slug) DO NOTHING;
