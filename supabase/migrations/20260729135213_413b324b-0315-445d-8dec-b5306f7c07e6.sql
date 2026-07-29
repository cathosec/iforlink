CREATE OR REPLACE FUNCTION public.list_custom_domains_to_sync(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, hostname text, cf_custom_hostname_id text, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, hostname, cf_custom_hostname_id, status
  FROM public.custom_domains
  WHERE status IN ('pending_dns', 'pending_ssl', 'failed')
  ORDER BY COALESCE(last_synced_at, created_at) ASC
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;