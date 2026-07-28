
CREATE OR REPLACE FUNCTION public.get_pix_campaign_public_data(_slug text)
RETURNS TABLE(
  campaign_id uuid,
  accepts_card boolean,
  public_key text,
  live_mode boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.accepts_card, a.public_key, a.live_mode
  FROM public.pix_campaigns c
  JOIN public.mp_accounts a ON a.user_id = c.user_id
  WHERE c.slug = _slug AND c.is_active = true
  LIMIT 1;
$$;
