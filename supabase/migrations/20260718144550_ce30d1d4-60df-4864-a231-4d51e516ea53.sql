
CREATE OR REPLACE FUNCTION public.get_public_setting(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.platform_settings
  WHERE key = _key AND _key IN ('ads','announcement')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_setting(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_setting(text) TO anon, authenticated, service_role;
