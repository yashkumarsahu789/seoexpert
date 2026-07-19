-- Allow UI to clear demo task history
CREATE POLICY bulk_tasks_anon_delete ON public.bulk_tasks
  FOR DELETE TO anon, authenticated
  USING (true);
