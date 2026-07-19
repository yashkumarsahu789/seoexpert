-- AI Center: orchestrated multi-agent task queue + daily usage tracking

CREATE TABLE IF NOT EXISTS public.ai_center_tasks (
  id bigserial PRIMARY KEY,
  task_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  input_text text NOT NULL DEFAULT '',
  input_payload jsonb NOT NULL DEFAULT '{}',
  output_text text,
  output_payload jsonb,
  assigned_agent_id text,
  bulk_task_id bigint REFERENCES public.bulk_tasks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'assigning', 'processing', 'completed', 'failed', 'no_agent')),
  decline_log jsonb NOT NULL DEFAULT '[]',
  estimated_calls integer NOT NULL DEFAULT 1,
  github_repo text,
  github_path text,
  github_committed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_tasks
  ADD COLUMN IF NOT EXISTS model_key text;

CREATE INDEX IF NOT EXISTS idx_ai_center_tasks_status_created
  ON public.ai_center_tasks (status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ai_center_tasks_agent
  ON public.ai_center_tasks (assigned_agent_id)
  WHERE status IN ('assigning', 'processing');

CREATE OR REPLACE FUNCTION public.set_ai_center_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_center_tasks_updated_at ON public.ai_center_tasks;
CREATE TRIGGER ai_center_tasks_updated_at
  BEFORE UPDATE ON public.ai_center_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_center_tasks_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_agent_usage (
  agent_id text NOT NULL,
  usage_date date NOT NULL DEFAULT (timezone('UTC', now()))::date,
  calls_used integer NOT NULL DEFAULT 0 CHECK (calls_used >= 0),
  PRIMARY KEY (agent_id, usage_date)
);

ALTER TABLE public.ai_center_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_center_tasks_anon_select ON public.ai_center_tasks
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY ai_center_tasks_anon_insert ON public.ai_center_tasks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY ai_center_tasks_anon_update ON public.ai_center_tasks
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY ai_center_tasks_anon_delete ON public.ai_center_tasks
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY ai_agent_usage_anon_select ON public.ai_agent_usage
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY ai_agent_usage_anon_insert ON public.ai_agent_usage
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY ai_agent_usage_anon_update ON public.ai_agent_usage
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
