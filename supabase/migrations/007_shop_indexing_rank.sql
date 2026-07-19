-- Shop Sync: indexing status + daily rank snapshots
ALTER TABLE public.indexing_queue
  ADD COLUMN IF NOT EXISTS index_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_indexed boolean,
  ADD COLUMN IF NOT EXISTS last_index_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sitemap_ping_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS index_method text DEFAULT 'sitemap_ping';

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS last_rank_check_at timestamptz;

CREATE TABLE IF NOT EXISTS public.shop_rank_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  rank_position integer,
  shop_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_rank_snapshots_shop ON public.shop_rank_snapshots (shop_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_indexing_queue_status ON public.indexing_queue (index_status, next_retry_at);

ALTER TABLE public.shop_rank_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_rank_snapshots_anon ON public.shop_rank_snapshots FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
