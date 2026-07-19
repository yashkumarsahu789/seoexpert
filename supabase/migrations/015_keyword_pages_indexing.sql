-- Keyword pages: SEO + indexing tracking
ALTER TABLE public.keyword_pages
  ADD COLUMN IF NOT EXISTS public_url TEXT,
  ADD COLUMN IF NOT EXISTS index_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_index_ping_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_index_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

CREATE INDEX IF NOT EXISTS idx_keyword_pages_index_status
  ON public.keyword_pages (index_status, last_index_ping_at DESC);
