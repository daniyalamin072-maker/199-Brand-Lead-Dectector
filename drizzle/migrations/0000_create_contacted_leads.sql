CREATE TABLE public.contacted_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  business_key text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  website text NOT NULL DEFAULT 'None' CHECK (website = 'None'),
  contacted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_key)
);
GRANT SELECT, INSERT ON public.contacted_leads TO authenticated;
GRANT ALL ON public.contacted_leads TO service_role;
ALTER TABLE public.contacted_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own contacted leads" ON public.contacted_leads FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Save own contacted leads" ON public.contacted_leads FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE INDEX contacted_leads_user_date ON public.contacted_leads (user_id, contacted_at DESC);