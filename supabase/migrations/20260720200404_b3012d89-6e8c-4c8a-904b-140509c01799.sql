
CREATE OR REPLACE FUNCTION public.get_admin_notify_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(btrim(COALESCE(value->>'admin_notify_to', '')), '')
  FROM public.platform_settings
  WHERE key = 'email'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_notify_email() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_pix_payment_context(_pix_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  username text,
  amount_cents integer,
  billing_interval text,
  paid_at timestamptz,
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    u.email::text,
    pr.display_name,
    pr.username,
    p.amount_cents,
    p."interval"::text AS billing_interval,
    p.paid_at,
    p.status
  FROM public.pix_payments p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.id = _pix_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_pix_payment_context(uuid) TO anon, authenticated, service_role;
