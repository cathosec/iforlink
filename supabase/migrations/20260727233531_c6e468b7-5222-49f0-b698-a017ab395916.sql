
-- ============ mp_accounts ============
CREATE TABLE public.mp_accounts (
  user_id uuid PRIMARY KEY,
  mp_user_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  public_key text,
  live_mode boolean NOT NULL DEFAULT true,
  scope text,
  expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.mp_accounts TO authenticated;
GRANT ALL ON public.mp_accounts TO service_role;
ALTER TABLE public.mp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own mp account" ON public.mp_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mp account" ON public.mp_accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage mp accounts" ON public.mp_accounts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER mp_accounts_updated_at BEFORE UPDATE ON public.mp_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ pix_campaigns ============
CREATE TABLE public.pix_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  cover_url text,
  accent_color text NOT NULL DEFAULT '#1e40af',
  goal_cents integer,
  min_cents integer NOT NULL DEFAULT 500,
  suggested_amounts integer[] NOT NULL DEFAULT ARRAY[1000,2500,5000,10000],
  accepts_card boolean NOT NULL DEFAULT false,
  pass_fee_to_supporter boolean NOT NULL DEFAULT false,
  show_supporters boolean NOT NULL DEFAULT true,
  allow_message boolean NOT NULL DEFAULT true,
  ends_at timestamptz,
  raised_cents integer NOT NULL DEFAULT 0,
  supporters_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pix_campaigns_user_idx ON public.pix_campaigns(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_campaigns TO authenticated;
GRANT SELECT ON public.pix_campaigns TO anon;
GRANT ALL ON public.pix_campaigns TO service_role;
ALTER TABLE public.pix_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own campaigns" ON public.pix_campaigns
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public reads active campaigns" ON public.pix_campaigns
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage all campaigns" ON public.pix_campaigns
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER pix_campaigns_updated_at BEFORE UPDATE ON public.pix_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Limite Free: 1 campanha ativa
CREATE OR REPLACE FUNCTION public.check_free_pix_campaign_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role(NEW.user_id) = 'free' THEN
    IF (SELECT COUNT(*) FROM public.pix_campaigns WHERE user_id = NEW.user_id) >= 1 THEN
      RAISE EXCEPTION 'Limite do plano Free atingido (1 campanha PIX). Faça upgrade para Pro.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pix_campaigns_free_limit
  BEFORE INSERT ON public.pix_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.check_free_pix_campaign_limit();

-- ============ pix_contributions ============
CREATE TABLE public.pix_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pix_campaigns(id) ON DELETE CASCADE,
  supporter_name text,
  supporter_email text,
  message text,
  is_anonymous boolean NOT NULL DEFAULT false,
  amount_cents integer NOT NULL,
  net_cents integer NOT NULL,
  fee_cents integer NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pending',
  mp_payment_id text,
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  badge_key text,
  approved_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pix_contributions_campaign_idx ON public.pix_contributions(campaign_id, status);

GRANT SELECT ON public.pix_contributions TO authenticated;
GRANT ALL ON public.pix_contributions TO service_role;
ALTER TABLE public.pix_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign owner reads contributions" ON public.pix_contributions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pix_campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins read all contributions" ON public.pix_contributions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- View pública com colaboradores aprovados (nome/valor/mensagem/selo)
CREATE OR REPLACE VIEW public.pix_supporters_public
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.campaign_id,
  CASE WHEN c.is_anonymous THEN 'Anônimo' ELSE COALESCE(c.supporter_name, 'Anônimo') END AS supporter_name,
  CASE WHEN c.is_anonymous THEN NULL ELSE c.message END AS message,
  c.amount_cents,
  c.badge_key,
  c.approved_at
FROM public.pix_contributions c
JOIN public.pix_campaigns pc ON pc.id = c.campaign_id AND pc.is_active = true AND pc.show_supporters = true
WHERE c.status = 'approved';

GRANT SELECT ON public.pix_supporters_public TO anon, authenticated;

-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.calc_pix_badge(_amount_cents integer)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  badges jsonb;
  item jsonb;
  best text := NULL;
  best_min int := -1;
  m int;
BEGIN
  SELECT value INTO badges FROM public.platform_settings WHERE key = 'pix_badges' LIMIT 1;
  IF badges IS NULL THEN RETURN NULL; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(badges->'items') LOOP
    m := COALESCE((item->>'min_cents')::int, 0);
    IF _amount_cents >= m AND m > best_min THEN
      best_min := m;
      best := item->>'key';
    END IF;
  END LOOP;
  RETURN best;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_pending_pix_contribution(
  _campaign_id uuid,
  _supporter_name text,
  _supporter_email text,
  _message text,
  _is_anonymous boolean,
  _amount_cents integer,
  _net_cents integer,
  _fee_cents integer,
  _method text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
  camp public.pix_campaigns%ROWTYPE;
BEGIN
  SELECT * INTO camp FROM public.pix_campaigns WHERE id = _campaign_id AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'campaign not found or inactive'; END IF;
  IF _amount_cents < camp.min_cents THEN RAISE EXCEPTION 'amount below minimum'; END IF;

  INSERT INTO public.pix_contributions (
    campaign_id, supporter_name, supporter_email, message, is_anonymous,
    amount_cents, net_cents, fee_cents, method, status
  ) VALUES (
    _campaign_id,
    NULLIF(btrim(coalesce(_supporter_name,'')),''),
    NULLIF(btrim(coalesce(_supporter_email,'')),''),
    NULLIF(btrim(coalesce(_message,'')),''),
    coalesce(_is_anonymous,false),
    _amount_cents, _net_cents, _fee_cents,
    coalesce(_method,'pix'),
    'pending'
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_pix_contribution(uuid,text,text,text,boolean,integer,integer,integer,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.attach_pix_contribution_mp(
  _contribution_id uuid,
  _mp_payment_id text,
  _qr_code text,
  _qr_code_base64 text,
  _ticket_url text,
  _status text,
  _raw jsonb
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.pix_contributions
  SET mp_payment_id = _mp_payment_id,
      qr_code = _qr_code,
      qr_code_base64 = _qr_code_base64,
      ticket_url = _ticket_url,
      status = coalesce(_status, status),
      raw = coalesce(_raw, raw)
  WHERE id = _contribution_id;
$$;

GRANT EXECUTE ON FUNCTION public.attach_pix_contribution_mp(uuid,text,text,text,text,text,jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_pix_contribution_update(
  _contribution_id uuid,
  _mp_payment jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row public.pix_contributions%ROWTYPE;
  new_status text;
  badge text;
BEGIN
  SELECT * INTO row FROM public.pix_contributions WHERE id = _contribution_id LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  new_status := coalesce(_mp_payment->>'status', row.status);

  IF new_status = 'approved' AND row.status <> 'approved' THEN
    badge := public.calc_pix_badge(row.amount_cents);
    UPDATE public.pix_contributions
    SET status = 'approved', approved_at = now(), badge_key = badge, raw = _mp_payment,
        mp_payment_id = coalesce(_mp_payment->>'id', mp_payment_id)
    WHERE id = row.id;

    UPDATE public.pix_campaigns
    SET raised_cents = raised_cents + row.amount_cents,
        supporters_count = supporters_count + 1,
        updated_at = now()
    WHERE id = row.campaign_id;
  ELSE
    UPDATE public.pix_contributions
    SET status = new_status, raw = _mp_payment,
        mp_payment_id = coalesce(_mp_payment->>'id', mp_payment_id)
    WHERE id = row.id;
  END IF;
END;
$$;

-- Contexto público (dono/token) só via service role — não concedemos EXECUTE a anon.
CREATE OR REPLACE FUNCTION public.get_pix_campaign_owner_token(_campaign_id uuid)
RETURNS TABLE(user_id uuid, access_token text, live_mode boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.user_id, a.access_token, a.live_mode
  FROM public.pix_campaigns c
  JOIN public.mp_accounts a ON a.user_id = c.user_id
  WHERE c.id = _campaign_id
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_pix_campaign_owner_token(uuid) FROM PUBLIC, anon, authenticated;

-- ============ platform_settings seed ============
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('pix_config',
   jsonb_build_object(
     'enabled', true,
     'fee_percent', 3.99,
     'min_fee_cents', 50,
     'oauth_client_id', '',
     'oauth_client_secret', ''
   ),
   'Configuração do módulo PIX (comissão e OAuth Mercado Pago)'),
  ('pix_badges',
   jsonb_build_object(
     'items', jsonb_build_array(
       jsonb_build_object('key','bronze','label','Bronze','min_cents',1000,'color','#a16207','icon','Medal'),
       jsonb_build_object('key','silver','label','Prata','min_cents',5000,'color','#64748b','icon','Award'),
       jsonb_build_object('key','gold','label','Ouro','min_cents',10000,'color','#eab308','icon','Trophy'),
       jsonb_build_object('key','diamond','label','Diamante','min_cents',50000,'color','#38bdf8','icon','Gem'),
       jsonb_build_object('key','legend','label','Lenda','min_cents',100000,'color','#a855f7','icon','Crown')
     )
   ),
   'Selos do módulo PIX por faixa de valor')
ON CONFLICT (key) DO NOTHING;

-- Whitelist pix_config no leitor público de settings
CREATE OR REPLACE FUNCTION public.get_public_setting(_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM public.platform_settings
  WHERE key = _key AND _key IN ('ads','announcement','analytics','pix_config','pix_badges')
  LIMIT 1;
$$;

-- ============ storage bucket policies (bucket created via tool) ============
CREATE POLICY "pix-covers public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pix-covers');
CREATE POLICY "pix-covers owner write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pix-covers' AND owner = auth.uid());
CREATE POLICY "pix-covers owner update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'pix-covers' AND owner = auth.uid());
CREATE POLICY "pix-covers owner delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pix-covers' AND owner = auth.uid());
