-- Converte quaisquer subpath existentes para root (segurança)
UPDATE public.custom_domains SET mode = 'root', path_prefix = NULL WHERE mode <> 'root';

-- Aperta CHECK constraint para aceitar apenas 'root'
ALTER TABLE public.custom_domains DROP CONSTRAINT IF EXISTS custom_domains_mode_check;
ALTER TABLE public.custom_domains ADD CONSTRAINT custom_domains_mode_check CHECK (mode IN ('root'));

-- Atualiza trigger de validação removendo lógica de subpath
CREATE OR REPLACE FUNCTION public.validate_custom_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host text;
  role app_role;
  active_count int;
BEGIN
  SELECT public.get_user_role(NEW.user_id) INTO role;
  IF role NOT IN ('pro','admin') THEN
    RAISE EXCEPTION 'Domínio personalizado requer plano Pro.';
  END IF;

  host := lower(btrim(NEW.hostname));
  host := regexp_replace(host, '^https?://', '');
  host := regexp_replace(host, '/.*$', '');

  IF host = '' THEN
    RAISE EXCEPTION 'hostname obrigatório';
  END IF;

  IF length(host) > 253
     OR host !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'hostname inválido: %', host;
  END IF;

  IF host = 'forlink.app'
     OR host LIKE '%.forlink.app'
     OR host LIKE '%.lovable.app'
     OR host LIKE '%.lovable.dev'
     OR host = 'localhost'
     OR host ~ '^[0-9.]+$' THEN
    RAISE EXCEPTION 'hostname reservado: %', host;
  END IF;

  NEW.hostname := host;
  NEW.mode := 'root';
  NEW.path_prefix := NULL;

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