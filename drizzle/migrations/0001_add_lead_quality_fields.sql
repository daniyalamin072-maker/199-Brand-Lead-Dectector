ALTER TABLE public.contacted_leads
  ADD COLUMN google_rating numeric,
  ADD COLUMN review_count integer,
  ADD COLUMN business_status text;
COMMENT ON COLUMN public.contacted_leads.google_rating IS 'Nullable for legacy history; unknown ratings must not qualify for display.';
COMMENT ON COLUMN public.contacted_leads.review_count IS 'Nullable for legacy history; unknown review counts must not qualify for display.';
COMMENT ON COLUMN public.contacted_leads.business_status IS 'Nullable for legacy history; only exact ACTIVE status qualifies for display.';