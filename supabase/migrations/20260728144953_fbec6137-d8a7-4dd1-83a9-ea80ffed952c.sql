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
    AND _key IN ('ads','announcement','analytics','pix_config','pix_badges','features')
  LIMIT 1;
$function$;

INSERT INTO public.platform_settings (key, value, description)
VALUES ('features', jsonb_build_object(
  'signup_enabled', true,
  'discovery_enabled', true,
  'maintenance_mode', false,
  'campaigns_enabled', true,
  'campaigns_card_enabled', true,
  'shortener_enabled', true,
  'ads_enabled', true,
  'pro_upgrade_enabled', true
), 'Feature flags globais da plataforma')
ON CONFLICT (key) DO UPDATE
SET value = public.platform_settings.value || jsonb_build_object(
  'campaigns_enabled', COALESCE((public.platform_settings.value->>'campaigns_enabled')::boolean, true),
  'campaigns_card_enabled', COALESCE((public.platform_settings.value->>'campaigns_card_enabled')::boolean, true),
  'shortener_enabled', COALESCE((public.platform_settings.value->>'shortener_enabled')::boolean, true),
  'ads_enabled', COALESCE((public.platform_settings.value->>'ads_enabled')::boolean, true),
  'pro_upgrade_enabled', COALESCE((public.platform_settings.value->>'pro_upgrade_enabled')::boolean, true)
);