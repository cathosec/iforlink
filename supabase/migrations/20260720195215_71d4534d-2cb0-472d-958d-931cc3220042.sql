CREATE OR REPLACE FUNCTION public.get_mercadopago_webhook_access_token(
  _signature text,
  _request_id text,
  _payment_id text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  cfg jsonb;
  webhook_secret text;
  parts text[];
  part text;
  ts text;
  v1 text;
  manifest text;
  expected text;
  mode text;
  token text;
BEGIN
  SELECT value INTO cfg
  FROM public.platform_settings
  WHERE key = 'mercadopago'
  LIMIT 1;

  webhook_secret := nullif(btrim(coalesce(cfg->>'webhook_secret', '')), '');
  IF webhook_secret IS NOT NULL THEN
    IF coalesce(_signature, '') = '' OR coalesce(_request_id, '') = '' OR coalesce(_payment_id, '') = '' THEN
      RAISE EXCEPTION 'invalid webhook signature';
    END IF;

    parts := string_to_array(_signature, ',');
    FOREACH part IN ARRAY parts LOOP
      part := btrim(part);
      IF split_part(part, '=', 1) = 'ts' THEN
        ts := split_part(part, '=', 2);
      ELSIF split_part(part, '=', 1) = 'v1' THEN
        v1 := split_part(part, '=', 2);
      END IF;
    END LOOP;

    IF coalesce(ts, '') = '' OR coalesce(v1, '') = '' THEN
      RAISE EXCEPTION 'invalid webhook signature';
    END IF;

    manifest := 'id:' || _payment_id || ';request-id:' || _request_id || ';ts:' || ts || ';';
    expected := extensions.encode(extensions.hmac(manifest, webhook_secret, 'sha256'), 'hex');

    IF lower(v1) <> lower(expected) THEN
      RAISE EXCEPTION 'invalid webhook signature';
    END IF;
  END IF;

  mode := coalesce(cfg->>'mode', 'test');
  token := CASE WHEN mode = 'live' THEN cfg->>'access_token_live' ELSE cfg->>'access_token_test' END;
  token := nullif(btrim(coalesce(token, '')), '');

  IF token IS NULL THEN
    RAISE EXCEPTION 'mercadopago access token missing';
  END IF;

  RETURN token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_mercadopago_webhook_access_token(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mercadopago_webhook_access_token(text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apply_mercadopago_payment_update(
  _pix_id uuid,
  _mp_payment jsonb,
  _signature text DEFAULT NULL,
  _request_id text DEFAULT NULL,
  _payment_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  cfg jsonb;
  webhook_secret text;
  parts text[];
  part text;
  ts text;
  v1 text;
  manifest text;
  expected text;
  pix_row public.pix_payments%ROWTYPE;
  payment_status text;
  payment_method text;
  mp_id text;
  start_at timestamptz;
  end_at timestamptz;
  sub_id uuid;
BEGIN
  SELECT * INTO pix_row
  FROM public.pix_payments
  WHERE id = _pix_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT value INTO cfg
  FROM public.platform_settings
  WHERE key = 'mercadopago'
  LIMIT 1;

  webhook_secret := nullif(btrim(coalesce(cfg->>'webhook_secret', '')), '');
  IF webhook_secret IS NOT NULL THEN
    IF coalesce(_signature, '') = '' OR coalesce(_request_id, '') = '' OR coalesce(_payment_id, '') = '' THEN
      RAISE EXCEPTION 'invalid webhook signature';
    END IF;

    parts := string_to_array(_signature, ',');
    FOREACH part IN ARRAY parts LOOP
      part := btrim(part);
      IF split_part(part, '=', 1) = 'ts' THEN
        ts := split_part(part, '=', 2);
      ELSIF split_part(part, '=', 1) = 'v1' THEN
        v1 := split_part(part, '=', 2);
      END IF;
    END LOOP;

    IF coalesce(ts, '') = '' OR coalesce(v1, '') = '' THEN
      RAISE EXCEPTION 'invalid webhook signature';
    END IF;

    manifest := 'id:' || _payment_id || ';request-id:' || _request_id || ';ts:' || ts || ';';
    expected := extensions.encode(extensions.hmac(manifest, webhook_secret, 'sha256'), 'hex');

    IF lower(v1) <> lower(expected) THEN
      RAISE EXCEPTION 'invalid webhook signature';
    END IF;
  END IF;

  payment_status := coalesce(_mp_payment->>'status', 'pending');
  payment_method := coalesce(_mp_payment->>'payment_method_id', '');
  mp_id := coalesce(_mp_payment->>'id', _payment_id, pix_row.mp_payment_id);

  IF payment_method <> '' AND payment_method <> 'pix' THEN
    UPDATE public.pix_payments
    SET status = payment_status,
        raw = _mp_payment,
        updated_at = now()
    WHERE id = pix_row.id;
    RETURN;
  END IF;

  UPDATE public.pix_payments
  SET status = payment_status,
      mp_payment_id = coalesce(mp_id, mp_payment_id),
      raw = _mp_payment,
      paid_at = CASE WHEN payment_status = 'approved' AND paid_at IS NULL THEN now() ELSE paid_at END,
      updated_at = now()
  WHERE id = pix_row.id;

  IF payment_status <> 'approved' OR pix_row.paid_at IS NOT NULL THEN
    RETURN;
  END IF;

  start_at := now();
  end_at := start_at + CASE pix_row.interval
    WHEN 'quarter' THEN interval '90 days'
    WHEN 'year' THEN interval '365 days'
    ELSE interval '30 days'
  END;

  UPDATE public.subscriptions
  SET status = 'canceled',
      canceled_at = now(),
      updated_at = now()
  WHERE user_id = pix_row.user_id
    AND status = 'active';

  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    gateway,
    external_id,
    amount_cents,
    currency,
    interval,
    current_period_start,
    current_period_end
  ) VALUES (
    pix_row.user_id,
    'pro',
    'active',
    'mercadopago',
    coalesce(mp_id, pix_row.mp_payment_id),
    pix_row.amount_cents,
    'BRL',
    pix_row.interval,
    start_at,
    end_at
  )
  RETURNING id INTO sub_id;

  UPDATE public.pix_payments
  SET subscription_id = sub_id,
      updated_at = now()
  WHERE id = pix_row.id;

  DELETE FROM public.user_roles WHERE user_id = pix_row.user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (pix_row.user_id, 'pro')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_mercadopago_payment_update(uuid, jsonb, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_mercadopago_payment_update(uuid, jsonb, text, text, text) TO anon, authenticated, service_role;