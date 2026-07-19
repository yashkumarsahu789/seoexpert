-- Auto-call Edge Function on INSERT (pg_net — no Dashboard webhook needed)

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_process_llm_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://sbdlfyfkpatnxkrmslvq.supabase.co/functions/v1/process-llm-task',
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

DROP TRIGGER IF EXISTS bulk_tasks_process_llm ON public.bulk_tasks;
CREATE TRIGGER bulk_tasks_process_llm
  AFTER INSERT ON public.bulk_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_process_llm_task();
