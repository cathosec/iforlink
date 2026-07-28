CREATE TABLE public.user_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  addon text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  price_cents integer NOT NULL DEFAULT 0,
  notes text,
  activated_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_addons TO authenticated;
GRANT ALL ON public.user_addons TO service_role;
ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own addons" ON public.user_addons
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users request own addons" ON public.user_addons
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'requested');
CREATE POLICY "Users cancel own addons" ON public.user_addons
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'requested')
  WITH CHECK (auth.uid() = user_id AND status IN ('requested','canceled'));
CREATE POLICY "Admins manage all addons" ON public.user_addons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_user_addons_updated
  BEFORE UPDATE ON public.user_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'addons',
  jsonb_build_object(
    'items', jsonb_build_array(
      jsonb_build_object('key','custom_domain','label','Domínio próprio','price_cents',1990,'description','Use seu domínio (ex.: seunome.com.br) apontando para o ForLink.'),
      jsonb_build_object('key','advanced_analytics','label','Analytics avançado','price_cents',990,'description','Gráficos detalhados de origem, dispositivo e retenção de cliques.'),
      jsonb_build_object('key','priority_support','label','Suporte prioritário','price_cents',1490,'description','Atendimento com SLA reduzido por e-mail e WhatsApp.'),
      jsonb_build_object('key','white_label','label','Sem marca ForLink','price_cents',2490,'description','Remove o rodapé "feito com ForLink" do seu perfil público.')
    )
  ),
  'Catálogo de complementos pagos (Fase 4 – Monetização)'
)
ON CONFLICT (key) DO NOTHING;