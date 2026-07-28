
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_own_select" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_subs_own_insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subs_own_update" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subs_own_delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- SECURITY DEFINER: only returns subscriptions belonging to the campaign owner
CREATE OR REPLACE FUNCTION public.get_campaign_owner_push_subs(_campaign_id UUID)
RETURNS TABLE(endpoint TEXT, p256dh TEXT, auth TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.endpoint, ps.p256dh, ps.auth
  FROM public.push_subscriptions ps
  JOIN public.pix_campaigns c ON c.user_id = ps.user_id
  WHERE c.id = _campaign_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_owner_push_subs(uuid) TO service_role;

-- Helper to purge a dead subscription (called on 404/410 from push service)
CREATE OR REPLACE FUNCTION public.delete_push_subscription_by_endpoint(_endpoint TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_subscriptions WHERE endpoint = _endpoint;
$$;

GRANT EXECUTE ON FUNCTION public.delete_push_subscription_by_endpoint(text) TO service_role;
