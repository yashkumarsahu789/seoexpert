-- Configurable Supabase URL for pg_net Edge Function triggers

CREATE TABLE IF NOT EXISTS public.app_config (
  id text PRIMARY KEY DEFAULT 'default',
  supabase_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_config (id, supabase_url)
VALUES ('default', 'https://sbdlfyfkpatnxkrmslvq.supabase.co')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'app_config_anon_select') THEN
    CREATE POLICY app_config_anon_select ON public.app_config FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_app_supabase_url()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT supabase_url FROM public.app_config WHERE id = 'default' LIMIT 1),
    'https://sbdlfyfkpatnxkrmslvq.supabase.co'
  );
$$;

CREATE OR REPLACE FUNCTION public.notify_process_llm_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  base_url text;
BEGIN
  base_url := public.get_app_supabase_url();
  PERFORM net.http_post(
    url := base_url || '/functions/v1/process-llm-task',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'bulk_tasks',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', NEW.id,
        'input_text', NEW.input_text
      )
    )
  );
  RETURN NEW;
END;
$$;
