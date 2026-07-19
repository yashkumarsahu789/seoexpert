-- Competitor gap v3: our page metrics + Gemini AI analysis
ALTER TABLE public.competitor_snapshots
  ADD COLUMN IF NOT EXISTS our_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS comparison jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.competitor_snapshots.our_setup IS 'Our page scrape metrics (word count, headings, domain age)';
COMMENT ON COLUMN public.competitor_snapshots.ai_analysis IS 'Gemini gap analysis: WhyTheyRank, ContentGap, ActionPlan';
COMMENT ON COLUMN public.competitor_snapshots.comparison IS 'Side-by-side comparison table data for UI';
