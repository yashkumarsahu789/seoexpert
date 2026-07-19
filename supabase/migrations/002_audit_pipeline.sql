-- Integrated SEO / AEO / GEO audit pipeline tables

CREATE TABLE IF NOT EXISTS public.websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  site_name text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  website_url text NOT NULL,
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  mode text NOT NULL DEFAULT 'full',
  wos_score numeric(5,2),
  s_seo numeric(5,2),
  s_aeo numeric(5,2),
  s_geo numeric(5,2),
  alpha numeric(4,3) NOT NULL DEFAULT 0.500,
  beta numeric(4,3) NOT NULL DEFAULT 0.250,
  gamma numeric(4,3) NOT NULL DEFAULT 0.250,
  token_count integer NOT NULL DEFAULT 0,
  report_html text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  technical jsonb NOT NULL DEFAULT '{}'::jsonb,
  keywords jsonb NOT NULL DEFAULT '{}'::jsonb,
  competitors jsonb NOT NULL DEFAULT '{}'::jsonb,
  aeo_geo jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid NOT NULL REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  category text NOT NULL,
  dimension text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text,
  fix_code text,
  remediation text,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_website_id ON public.audit_runs(website_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_domain ON public.audit_runs(domain);
CREATE INDEX IF NOT EXISTS idx_audit_runs_started_at ON public.audit_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_findings_run_id ON public.audit_findings(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_severity ON public.audit_findings(severity);

ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS websites_anon_all ON public.websites;
CREATE POLICY websites_anon_all ON public.websites
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS audit_runs_anon_all ON public.audit_runs;
CREATE POLICY audit_runs_anon_all ON public.audit_runs
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS audit_findings_anon_all ON public.audit_findings;
CREATE POLICY audit_findings_anon_all ON public.audit_findings
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON public.websites TO anon, authenticated, service_role;
GRANT ALL ON public.audit_runs TO anon, authenticated, service_role;
GRANT ALL ON public.audit_findings TO anon, authenticated, service_role;
