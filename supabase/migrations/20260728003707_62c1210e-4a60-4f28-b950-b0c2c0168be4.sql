GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_setting(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND _key IN ('ads','announcement','analytics','pix_config','pix_badges')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_setting(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_setting(text) TO anon, authenticated, service_role;