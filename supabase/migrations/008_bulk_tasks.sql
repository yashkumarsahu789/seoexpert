-- Bulk LLM pipeline: n8n INSERT → DB webhook → Edge Function → Cloudflare Workers AI

CREATE TABLE IF NOT EXISTS public.bulk_tasks (
  id bigserial PRIMARY KEY,
  input_text text NOT NULL,
  ai_response text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_tasks_status_created
  ON public.bulk_tasks (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_bulk_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bulk_tasks_updated_at ON public.bulk_tasks;
CREATE TRIGGER bulk_tasks_updated_at
  BEFORE UPDATE ON public.bulk_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bulk_tasks_updated_at();

ALTER TABLE public.bulk_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY bulk_tasks_anon_select ON public.bulk_tasks
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY bulk_tasks_anon_insert ON public.bulk_tasks
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY bulk_tasks_anon_update ON public.bulk_tasks
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);
