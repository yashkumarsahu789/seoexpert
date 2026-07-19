-- Pass model_key from bulk_tasks to Edge Function (AI Center per-agent routing)

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
        'input_text', NEW.input_text,
        'model_key', NEW.model_key
      )
    )
  );
  RETURN NEW;
END;
$$;
