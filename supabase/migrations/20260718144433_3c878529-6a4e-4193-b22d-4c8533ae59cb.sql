
DROP POLICY IF EXISTS "Anyone reads settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Public can read settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Public read settings" ON public.platform_settings;
CREATE POLICY "Admins read settings" ON public.platform_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public read short_links" ON public.short_links;
DROP POLICY IF EXISTS "Anyone reads short_links" ON public.short_links;
DROP POLICY IF EXISTS "Public can read short links" ON public.short_links;
DROP POLICY IF EXISTS "Anyone can read short_links" ON public.short_links;

CREATE OR REPLACE FUNCTION public.resolve_short_link(_code text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT url FROM public.short_links WHERE code = _code LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_short_link(text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_short_link(text) TO anon, authenticated, service_role;
