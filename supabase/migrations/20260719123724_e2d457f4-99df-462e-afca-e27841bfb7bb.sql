
CREATE OR REPLACE FUNCTION public.get_pricing_public()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'enabled', COALESCE((value->>'enabled')::boolean, false),
    'mode', COALESCE(value->>'mode', 'test'),
    'pix_expiration_minutes', COALESCE((value->>'pix_expiration_minutes')::int, 30),
    'prices', COALESCE(value->'prices', '{}'::jsonb)
  )
  FROM public.platform_settings
  WHERE key = 'mercadopago'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_pricing_public() TO anon, authenticated;
