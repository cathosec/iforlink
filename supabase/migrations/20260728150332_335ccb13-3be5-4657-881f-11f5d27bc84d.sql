-- Fase 3 (Monetização): taxas dinâmicas de campanhas por plano — retry

INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'campaign_fees',
  jsonb_build_object(
    'free', jsonb_build_object('pct', 4, 'min_cents', 50),
    'pro',  jsonb_build_object('pct', 1, 'min_cents', 25)
  ),
  'Comissão do ForLink por plano do criador (Fase 3 Monetização)'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_public_setting(_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _key = 'pix_config' THEN jsonb_build_object(
      'enabled', COALESCE((value->>'enabled')::boolean, false),
      'fee_percent', COALESCE((value->>'fee_percent')::numeric, 0),
      'min_fee_cents', COALESCE((value->>'min_fee_cents')::int, 0),
      'oauth_client_id', COALESCE(value->>'oauth_client_id', ''),
      'has_oauth_client_secret', NULLIF(btrim(COALESCE(value->>'oauth_client_secret', '')), '') IS NOT NULL
    )
    ELSE value
  END
  FROM public.platform_settings
  WHERE key = _key
    AND _key IN ('ads','announcement','analytics','pix_config','pix_badges','features','campaign_fees')
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_campaign_fee_for_user(_user_id uuid)
RETURNS TABLE(fee_pct numeric, min_fee_cents int, creator_role app_role)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fees jsonb;
  pixcfg jsonb;
  r app_role;
  bucket jsonb;
  legacy_pct numeric;
  legacy_min int;
BEGIN
  r := public.get_user_role(_user_id);
  IF r IS NULL THEN r := 'free'::app_role; END IF;

  SELECT value INTO fees FROM public.platform_settings WHERE key = 'campaign_fees' LIMIT 1;
  SELECT value INTO pixcfg FROM public.platform_settings WHERE key = 'pix_config' LIMIT 1;

  legacy_pct := COALESCE((pixcfg->>'fee_percent')::numeric, 0);
  legacy_min := COALESCE((pixcfg->>'min_fee_cents')::int, 0);

  IF fees IS NULL THEN
    fee_pct := legacy_pct;
    min_fee_cents := legacy_min;
    creator_role := r;
    RETURN NEXT;
    RETURN;
  END IF;

  bucket := fees -> CASE WHEN r = 'admin' THEN 'pro' ELSE r::text END;
  IF bucket IS NULL THEN
    bucket := fees -> 'free';
  END IF;

  fee_pct := COALESCE((bucket->>'pct')::numeric, legacy_pct);
  min_fee_cents := COALESCE((bucket->>'min_cents')::int, legacy_min);
  creator_role := r;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_fee_for_user(uuid) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_pix_campaign_public_data(text);
CREATE FUNCTION public.get_pix_campaign_public_data(_slug text)
 RETURNS TABLE(
   campaign_id uuid, accepts_card boolean, public_key text, live_mode boolean,
   fee_pct numeric, min_fee_cents int, creator_role text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.accepts_card, a.public_key, a.live_mode,
         f.fee_pct, f.min_fee_cents, f.creator_role::text
  FROM public.pix_campaigns c
  JOIN public.mp_accounts a ON a.user_id = c.user_id
  CROSS JOIN LATERAL public.get_campaign_fee_for_user(c.user_id) f
  WHERE c.slug = _slug AND c.is_active = true
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_pix_campaign_public_data(text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_pix_campaign_owner_token(uuid);
CREATE FUNCTION public.get_pix_campaign_owner_token(_campaign_id uuid)
 RETURNS TABLE(
   user_id uuid, access_token text, live_mode boolean,
   fee_pct numeric, min_fee_cents int, creator_role text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.user_id, a.access_token, a.live_mode,
         f.fee_pct, f.min_fee_cents, f.creator_role::text
  FROM public.pix_campaigns c
  JOIN public.mp_accounts a ON a.user_id = c.user_id
  CROSS JOIN LATERAL public.get_campaign_fee_for_user(c.user_id) f
  WHERE c.id = _campaign_id
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_pix_campaign_owner_token(uuid) TO anon, authenticated, service_role;