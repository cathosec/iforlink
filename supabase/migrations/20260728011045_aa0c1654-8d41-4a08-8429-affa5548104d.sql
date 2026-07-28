
CREATE OR REPLACE FUNCTION public.get_pix_contribution_status(_id uuid)
RETURNS TABLE(id uuid, status text, approved_at timestamptz, amount_cents integer, badge_key text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, status, approved_at, amount_cents, badge_key
  FROM public.pix_contributions
  WHERE id = _id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_pix_contribution_status(uuid) TO anon, authenticated;
