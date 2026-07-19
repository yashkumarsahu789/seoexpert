-- websites: normalized domain for duplicate prevention (run manually in Supabase SQL)
ALTER TABLE public.websites ADD COLUMN IF NOT EXISTS domain text;

UPDATE public.websites
SET domain = lower(
  regexp_replace(
    regexp_replace(url, '^https?://(www\.)?', '', 'i'),
    '/.*$',
    ''
  )
)
WHERE domain IS NULL OR domain = '';

-- Optional: remove duplicate domains (keep newest), then add unique index:
-- DELETE FROM public.websites w1 USING public.websites w2
-- WHERE w1.domain = w2.domain AND w1.created_at < w2.created_at;
-- CREATE UNIQUE INDEX idx_websites_domain_unique ON public.websites (domain) WHERE domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_websites_domain ON public.websites (domain);
