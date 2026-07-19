-- Base shop / heartbeat / automation tables (missing from earlier migrations)

CREATE TABLE IF NOT EXISTS public.n8n_heartbeat (
  id text PRIMARY KEY,
  last_ping_at timestamptz,
  source text,
  status text DEFAULT 'unknown',
  instance_url text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_shop_id text,
  name text NOT NULL DEFAULT '',
  slug text NOT NULL,
  city text DEFAULT 'India',
  area text,
  shop_url text,
  sitemap_entry_url text,
  image_cdn_url text,
  product_types text[] DEFAULT ARRAY['general']::text[],
  primary_keywords text[] DEFAULT '{}'::text[],
  source text,
  automation_status text DEFAULT 'active',
  seo_priority integer DEFAULT 0,
  seo_synced boolean DEFAULT false,
  needs_boost boolean DEFAULT false,
  boost_cooldown_until timestamptz,
  latitude double precision,
  longitude double precision,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug ON public.shops (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_source_shop_id ON public.shops (source_shop_id) WHERE source_shop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shops_shop_url ON public.shops (shop_url);

CREATE TABLE IF NOT EXISTS public.indexing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  url text NOT NULL,
  url_type text DEFAULT 'shop',
  in_sitemap boolean DEFAULT true,
  index_method text DEFAULT 'sitemap_ping',
  index_status text NOT NULL DEFAULT 'pending',
  is_indexed boolean,
  last_index_check_at timestamptz,
  last_sitemap_ping_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indexing_queue_shop ON public.indexing_queue (shop_id);
CREATE INDEX IF NOT EXISTS idx_indexing_queue_status ON public.indexing_queue (index_status, next_retry_at);

CREATE TABLE IF NOT EXISTS public.location_keyword_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  area text NOT NULL DEFAULT '',
  product_type text NOT NULL DEFAULT 'general',
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, area, product_type)
);

CREATE TABLE IF NOT EXISTS public.rs_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  name text,
  slug text,
  city text,
  area text,
  shop_url text,
  product_types text[] DEFAULT '{}'::text[],
  primary_keywords text[] DEFAULT '{}'::text[],
  latitude double precision,
  longitude double precision,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'error',
  workflow_name text,
  error_message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  requires_human boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_errors_open ON public.automation_errors (resolved, requires_human, created_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name text,
  status text NOT NULL DEFAULT 'completed',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.n8n_heartbeat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rs_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'n8n_heartbeat' AND policyname = 'n8n_heartbeat_anon') THEN
    CREATE POLICY n8n_heartbeat_anon ON public.n8n_heartbeat FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shops' AND policyname = 'shops_anon') THEN
    CREATE POLICY shops_anon ON public.shops FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'indexing_queue' AND policyname = 'indexing_queue_anon') THEN
    CREATE POLICY indexing_queue_anon ON public.indexing_queue FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_keyword_clusters' AND policyname = 'location_keyword_clusters_anon') THEN
    CREATE POLICY location_keyword_clusters_anon ON public.location_keyword_clusters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rs_shops' AND policyname = 'rs_shops_anon') THEN
    CREATE POLICY rs_shops_anon ON public.rs_shops FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_errors' AND policyname = 'automation_errors_anon') THEN
    CREATE POLICY automation_errors_anon ON public.automation_errors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_runs' AND policyname = 'automation_runs_anon') THEN
    CREATE POLICY automation_runs_anon ON public.automation_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
