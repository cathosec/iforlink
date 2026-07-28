CREATE OR REPLACE FUNCTION public.resolve_pix_contribution_by_mp(_mp_payment_id text)
RETURNS TABLE(contribution_id uuid, campaign_id uuid, access_token text, live_mode boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.campaign_id, a.access_token, a.live_mode
  FROM public.pix_contributions c
  JOIN public.pix_campaigns camp ON camp.id = c.campaign_id
  JOIN public.mp_accounts a ON a.user_id = camp.user_id
  WHERE c.mp_payment_id = _mp_payment_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_pix_contribution_by_mp(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_mp_account_tokens()
RETURNS TABLE(access_token text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT access_token FROM public.mp_accounts WHERE access_token IS NOT NULL LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.list_mp_account_tokens() TO anon, authenticated, service_role;