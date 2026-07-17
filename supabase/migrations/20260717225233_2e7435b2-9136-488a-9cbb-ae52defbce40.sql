CREATE OR REPLACE FUNCTION public.increment_profile_view(_username text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET views_count = views_count + 1 WHERE username = _username;
$$;

GRANT EXECUTE ON FUNCTION public.increment_profile_view(text) TO anon, authenticated;