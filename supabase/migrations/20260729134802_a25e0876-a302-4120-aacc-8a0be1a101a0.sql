-- ============================================================================
-- Fase 1: Domínios personalizados (Cloudflare for SaaS)
-- ============================================================================

CREATE TABLE public.custom_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostname text NOT NULL,
  mode text NOT NULL DEFAULT 'root' CHECK (mode IN ('root','subpath')),
  path_prefix text,
  cf_custom_hostname_id text,
  status text NOT NULL DEFAULT 'pending_dns'
    CHECK (status IN ('pending_dns','pending_ssl','active','failed','removed')),
  ssl_status text,
  ownership_verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX custom_domains_hostname_key
  ON public.custom_domains (lower(hostname))
  WHERE status <> 'removed';

CREATE INDEX custom_domains_user_id_idx ON public.custom_domains (user_id);
CREATE INDEX custom_domains_status_idx ON public.custom_domains (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_domains TO authenticated;
GRANT ALL ON public.custom_domains TO service_role;

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_or_admin_select"
  ON public.custom_domains FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own_or_admin_insert"
  ON public.custom_domains FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own_or_admin_update"
  ON public.custom_domains FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own_or_admin_delete"
  ON public.custom_domains FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER custom_domains_updated_at
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Validação: só pro/admin, 1 por usuário, hostname válido
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_custom_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role app_role;
  active_count int;
  host text;
BEGIN
  role := public.get_user_role(NEW.user_id);
  IF role NOT IN ('pro','admin') THEN
    RAISE EXCEPTION 'Domínio personalizado é exclusivo do plano Pro.';
  END IF;

  host := lower(btrim(coalesce(NEW.hostname,'')));
  IF host = '' THEN
    RAISE EXCEPTION 'hostname obrigatório';
  END IF;

  -- regex: um ou mais rótulos DNS separados por ponto, tamanho total <= 253
  IF length(host) > 253
     OR host !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'hostname inválido: %', host;
  END IF;

  -- bloqueia próprios domínios e provedores
  IF host = 'forlink.app'
     OR host LIKE '%.forlink.app'
     OR host LIKE '%.lovable.app'
     OR host LIKE '%.lovable.dev'
     OR host = 'localhost'
     OR host ~ '^[0-9.]+$' THEN
    RAISE EXCEPTION 'hostname reservado: %', host;
  END IF;

  NEW.hostname := host;

  -- normaliza path_prefix
  IF NEW.mode = 'subpath' THEN
    IF NEW.path_prefix IS NULL OR btrim(NEW.path_prefix) = '' THEN
      RAISE EXCEPTION 'path_prefix obrigatório para modo subpath';
    END IF;
    NEW.path_prefix := '/' || regexp_replace(btrim(NEW.path_prefix), '^/+|/+$', '', 'g');
  ELSE
    NEW.path_prefix := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO active_count
    FROM public.custom_domains
    WHERE user_id = NEW.user_id AND status <> 'removed';
    IF active_count >= 1 AND role <> 'admin' THEN
      RAISE EXCEPTION 'Limite de 1 domínio personalizado por conta Pro.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER custom_domains_validate
  BEFORE INSERT OR UPDATE ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION public.validate_custom_domain();

-- ============================================================================
-- Resolver público (usado pelo Worker no roteamento por Host)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_custom_domain(_hostname text)
RETURNS TABLE(username text, mode text, path_prefix text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.username, d.mode, d.path_prefix
  FROM public.custom_domains d
  JOIN public.profiles p ON p.id = d.user_id
  WHERE d.status = 'active'
    AND lower(d.hostname) = lower(btrim(coalesce(_hostname,'')))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_custom_domain(text) TO anon, authenticated, service_role;

-- ============================================================================
-- Listagem admin
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_list_custom_domains(_limit int DEFAULT 200)
RETURNS TABLE(
  id uuid, user_id uuid, username text, display_name text,
  hostname text, mode text, path_prefix text, status text,
  ssl_status text, last_error text, last_synced_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT d.id, d.user_id, p.username, p.display_name,
         d.hostname, d.mode, d.path_prefix, d.status,
         d.ssl_status, d.last_error, d.last_synced_at, d.created_at
  FROM public.custom_domains d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  ORDER BY d.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
END;
$$;

-- ============================================================================
-- Atualização de status vinda do cron/CF (admin ou service_role)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_custom_domain_status(
  _id uuid,
  _status text,
  _ssl_status text DEFAULT NULL,
  _ownership_verification jsonb DEFAULT NULL,
  _cf_id text DEFAULT NULL,
  _last_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _status IS NOT NULL AND _status NOT IN ('pending_dns','pending_ssl','active','failed','removed') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.custom_domains
  SET status = COALESCE(_status, status),
      ssl_status = COALESCE(_ssl_status, ssl_status),
      ownership_verification = COALESCE(_ownership_verification, ownership_verification),
      cf_custom_hostname_id = COALESCE(_cf_id, cf_custom_hostname_id),
      last_error = _last_error,
      last_synced_at = now(),
      updated_at = now()
  WHERE id = _id;
END;
$$;

-- ============================================================================
-- Lista domínios pendentes para o cron sincronizar
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_custom_domains_to_sync(_limit int DEFAULT 50)
RETURNS TABLE(id uuid, hostname text, cf_custom_hostname_id text, status text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT d.id, d.hostname, d.cf_custom_hostname_id, d.status
  FROM public.custom_domains d
  WHERE d.status IN ('pending_dns','pending_ssl','failed')
    AND (d.last_synced_at IS NULL OR d.last_synced_at < now() - interval '2 minutes')
  ORDER BY d.last_synced_at ASC NULLS FIRST
  LIMIT GREATEST(1, LEAST(_limit, 200));
END;
$$;