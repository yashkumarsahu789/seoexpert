-- Webflow spawned sites log (tools UI → n8n → Webflow API)
CREATE TABLE IF NOT EXISTS public.webflow_sites (
  id BIGSERIAL PRIMARY KEY,
  requirement TEXT NOT NULL DEFAULT '',
  site_name TEXT,
  subdomain_slug TEXT,
  site_url TEXT,
  webflow_site_id TEXT,
  cms_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'building', 'published', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webflow_sites_created ON public.webflow_sites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webflow_sites_slug ON public.webflow_sites(subdomain_slug);

ALTER TABLE public.webflow_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY webflow_sites_anon_select ON public.webflow_sites
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY webflow_sites_anon_insert ON public.webflow_sites
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY webflow_sites_anon_update ON public.webflow_sites
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
