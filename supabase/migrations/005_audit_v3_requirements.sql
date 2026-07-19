-- Website Audit v3: daily requirements catalog, rank tracking, transparent checks

CREATE TABLE IF NOT EXISTS public.audit_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar text NOT NULL CHECK (pillar IN ('seo', 'aeo', 'geo')),
  source_type text NOT NULL CHECK (source_type IN ('official', 'patent', 'tracker')),
  source_name text NOT NULL,
  source_url text,
  rule_code text NOT NULL,
  title text NOT NULL,
  description text,
  check_key text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  action_if_missing text NOT NULL DEFAULT 'add',
  action_if_present_weak text NOT NULL DEFAULT 'update',
  action_if_harmful text NOT NULL DEFAULT 'remove',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pillar, rule_code)
);

CREATE INDEX IF NOT EXISTS idx_audit_requirements_pillar ON public.audit_requirements (pillar, active);
CREATE INDEX IF NOT EXISTS idx_audit_requirements_source ON public.audit_requirements (source_type);

CREATE TABLE IF NOT EXISTS public.requirement_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  source_type text NOT NULL,
  source_name text NOT NULL,
  source_url text,
  items_fetched integer NOT NULL DEFAULT 0,
  items_upserted integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.site_requirement_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid NOT NULL REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  requirement_id uuid REFERENCES public.audit_requirements(id) ON DELETE SET NULL,
  pillar text NOT NULL,
  rule_code text NOT NULL,
  source_type text NOT NULL,
  source_name text,
  status text NOT NULL CHECK (status IN ('present', 'missing', 'needs_update', 'needs_remove', 'not_applicable')),
  title text NOT NULL,
  detail text,
  remediation text,
  severity text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_req_checks_run ON public.site_requirement_checks (audit_run_id);
CREATE INDEX IF NOT EXISTS idx_site_req_checks_pillar ON public.site_requirement_checks (audit_run_id, pillar);

CREATE TABLE IF NOT EXISTS public.keyword_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  rank_position integer,
  rank_url text,
  serp_features jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_volume integer,
  checked_at timestamptz NOT NULL DEFAULT now(),
  audit_run_id uuid REFERENCES public.audit_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_keyword_rankings_site ON public.keyword_rankings (website_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_kw ON public.keyword_rankings (website_id, keyword, checked_at DESC);

CREATE TABLE IF NOT EXISTS public.competitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid NOT NULL REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  competitor_url text NOT NULL,
  competitor_rank integer,
  our_rank integer,
  their_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  our_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  beat_plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_run ON public.competitor_snapshots (audit_run_id);

ALTER TABLE public.audit_runs
  ADD COLUMN IF NOT EXISTS phase_seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS phase_aeo jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS phase_geo jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS phase_keywords jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS phase_competitors jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.audit_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_requirement_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_requirements_anon_select ON public.audit_requirements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY audit_requirements_anon_write ON public.audit_requirements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY requirement_sync_log_anon ON public.requirement_sync_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY site_requirement_checks_anon ON public.site_requirement_checks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY keyword_rankings_anon ON public.keyword_rankings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY competitor_snapshots_anon ON public.competitor_snapshots FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
