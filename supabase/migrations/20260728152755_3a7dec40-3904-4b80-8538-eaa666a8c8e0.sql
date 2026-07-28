CREATE OR REPLACE FUNCTION public.user_has_active_addon(_user_id uuid, _addon text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_addons
    WHERE user_id = _user_id
      AND addon = _addon
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_active_addon(uuid, text) TO anon, authenticated;