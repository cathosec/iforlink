
-- Table for individual PIX charges via Mercado Pago
CREATE TABLE public.pix_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  mp_payment_id TEXT UNIQUE,
  plan public.app_role NOT NULL DEFAULT 'pro',
  interval TEXT NOT NULL CHECK (interval IN ('month','quarter','year')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled, refunded, expired
  qr_code TEXT,
  qr_code_base64 TEXT,
  ticket_url TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payer_email TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pix_payments TO authenticated;
GRANT ALL ON public.pix_payments TO service_role;

ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pix payments" ON public.pix_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage pix payments" ON public.pix_payments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pix_payments_updated_at BEFORE UPDATE ON public.pix_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX pix_payments_user_idx ON public.pix_payments(user_id, created_at DESC);
CREATE INDEX pix_payments_status_idx ON public.pix_payments(status);

-- Seed default mercadopago platform_settings row
INSERT INTO public.platform_settings (key, value, description)
VALUES ('mercadopago', jsonb_build_object(
  'enabled', false,
  'mode', 'test',
  'pix_expiration_minutes', 30,
  'prices', jsonb_build_object(
    'month_cents', 1990,
    'quarter_cents', 4990,
    'year_cents', 17990
  ),
  'webhook_secret_set', false,
  'access_token_set', false
), 'Configuração do Mercado Pago (PIX)')
ON CONFLICT (key) DO NOTHING;
