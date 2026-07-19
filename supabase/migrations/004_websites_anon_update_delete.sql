-- websites: allow anon update + delete (required for Saved Sites ↻ and ✕ buttons)
DROP POLICY IF EXISTS anon_update_websites ON public.websites;
CREATE POLICY anon_update_websites ON public.websites
  FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_delete_websites ON public.websites;
CREATE POLICY anon_delete_websites ON public.websites
  FOR DELETE TO anon, authenticated
  USING (true);

GRANT UPDATE, DELETE ON public.websites TO anon, authenticated;
