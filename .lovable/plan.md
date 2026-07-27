
# Módulo PIX — Páginas de Arrecadação (ForLink)

Novo módulo em que cada usuário conecta sua própria conta Mercado Pago (OAuth) e cria páginas de arrecadação com slug próprio. Os pagamentos vão **direto para a conta do criador**, sem passar pela conta ForLink. A plataforma cobra uma **comissão configurável** via `application_fee` do Mercado Pago (Marketplace/Split), e cada campanha pode escolher se **repassa a taxa ao colaborador** ou absorve.

## Arquitetura (visão geral)

```text
Colaborador (público) ──► /pix/<slug>  ──►  cria pagamento
                                          │
                                          ▼
                          POST server fn → API Mercado Pago
                          (Bearer = access_token do CRIADOR
                           + application_fee = % ForLink)
                                          │
                                          ▼
                          Pagamento cai na conta do criador
                                          │
                          Webhook /api/public/webhooks/mp-pix
                          confirma, grava colaborador + selo
                                          ▼
                          Página exibe nome + selo em tempo real
```

## Funcionalidades

### Super Admin (`/admin` → aba "PIX")
- Cadastro das credenciais globais da aplicação Mercado Pago (Client ID, Client Secret, Redirect URI) — guardado em `platform_settings` chave `mercadopago_oauth`.
- Comissão padrão da plataforma em % (ex.: 3.99%), min/max por transação, e ativar/desativar módulo.
- Catálogo de **selos** globais (nome, faixa de valor mínimo em centavos, cor, ícone, ordem). Ex.: Bronze ≥ R$10, Prata ≥ R$50, Ouro ≥ R$100, Diamante ≥ R$500.
- Listagem de todas as campanhas + estatísticas (arrecadação, taxas retidas).

### Criador (Dashboard)
- Botão **"Conectar Mercado Pago"** → OAuth do MP (`/authorization`) → callback `/api/public/oauth/mercadopago/callback` troca o `code` por `access_token` + `refresh_token` do usuário e grava em `mp_accounts`.
- Se desconectar, remove tokens.
- Limite: **Free = 1 campanha ativa**, **Pro = ilimitadas**.
- Criar campanha PIX com:
  - Título, slug único (`/pix/meu-slug`), descrição rica, imagem de capa (bucket `pix-covers`), cor de destaque
  - Meta (opcional), data de encerramento (opcional)
  - Valores sugeridos (ex.: 10, 25, 50, 100) e valor mínimo
  - Aceitar cartão? (usa Checkout Pro do MP quando marcado; PIX é padrão)
  - **Repassar taxa ao colaborador?** (bool) — quando true, valor cobrado = valor doado + taxa; quando false, taxa sai do criador
  - Exibir ranking de colaboradores? Anonimizar? Permitir mensagem?
- Ver colaborações recebidas, exportar CSV.

### Público (`/pix/<slug>`)
- Página personalizada: capa, título, descrição, barra de progresso (meta), botão de contribuir.
- Formulário: nome (ou "Anônimo"), e-mail, mensagem, valor (sugerido ou custom), método (PIX / cartão).
- Gera pagamento via server fn → retorna QR Code PIX ou redirect para Checkout Pro.
- **Mural de colaboradores** aprovados: nome + selo + valor (ou oculto se anônimo) + mensagem, ordenado por valor/recência.
- SEO: og:image = capa da campanha; título + descrição próprios.

## Modelo de dados (migration)

```sql
-- Conta MP conectada por usuário (OAuth)
CREATE TABLE public.mp_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- RLS: usuário lê/deleta a própria; escrita apenas via service_role (server fn OAuth)

-- Campanhas
CREATE TABLE public.pix_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  cover_url text,
  accent_color text DEFAULT '#1e40af',
  goal_cents integer,
  min_cents integer NOT NULL DEFAULT 500,
  suggested_amounts integer[] DEFAULT ARRAY[1000,2500,5000,10000],
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
-- RLS: dono gerencia; público SELECT quando is_active

-- Contribuições
CREATE TABLE public.pix_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pix_campaigns(id) ON DELETE CASCADE,
  supporter_name text,
  supporter_email text,
  message text,
  is_anonymous boolean NOT NULL DEFAULT false,
  amount_cents integer NOT NULL,          -- valor bruto cobrado
  net_cents integer NOT NULL,             -- líquido para criador
  fee_cents integer NOT NULL DEFAULT 0,   -- application_fee ForLink
  method text NOT NULL,                   -- pix | card
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|expired
  mp_payment_id text,
  qr_code text, qr_code_base64 text, ticket_url text,
  badge_key text,                         -- calculado no approval
  approved_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: dono da campanha lê tudo; público SELECT apenas colunas seguras (nome, badge, amount, message) via VIEW quando approved

-- Selos globais (via platform_settings key='pix_badges' JSON)
-- Config global (key='pix_config': fee_percent, min_fee_cents, enabled, oauth ids)
```

## Server functions e rotas

- `src/lib/pix.functions.ts`
  - `startMercadoPagoOAuth()` → gera URL de autorização (state assinado)
  - `disconnectMercadoPago()`
  - `createPixCampaign / updatePixCampaign / listMyCampaigns / deleteCampaign`
  - `getCampaignBySlug` (pública, via publishable client)
  - `createContribution({ slug, name, email, message, amount, method })` — usa access_token do dono + `application_fee`; devolve QR/URL
- `src/routes/api/public/oauth/mercadopago/callback.ts` — troca `code` por token, grava `mp_accounts`
- `src/routes/api/public/webhooks/mp-pix.ts` — separado do webhook de assinatura; identifica campanha via `external_reference`, aprova contribuição, calcula selo, incrementa `raised_cents`/`supporters_count`, dispara e-mail ao criador (Resend)

## Páginas

- `src/routes/_authenticated/pix.tsx` — dashboard PIX: conectar MP, lista de campanhas, criar/editar
- `src/routes/_authenticated/pix.$id.tsx` — editor + relatório da campanha
- `src/routes/pix.$slug.tsx` — página pública com capa, progresso, formulário, mural de colaboradores
- Aba **"PIX"** em `/admin` com config global e catálogo de selos

## Regras de comissão

`fee_cents = round(amount_input * fee_percent / 100)` respeitando `min_fee_cents`.
- `pass_fee_to_supporter=true`: `transaction_amount = amount_input + fee_cents`; colaborador vê valor final.
- `pass_fee_to_supporter=false`: `transaction_amount = amount_input`; `net_cents = amount_input - fee_cents`.
- Enviado ao MP como `application_fee` no `POST /v1/payments` usando o access_token do criador. ForLink recebe automaticamente via split do MP.

## Selos

Calculados no momento da aprovação comparando `amount_cents` contra faixas em `platform_settings.pix_badges`. Exibidos no mural com ícone Lucide e cor.

## SEO e analytics

- `head()` da rota pública gera título, descrição truncada, `og:image` = `cover_url`, `twitter:card=summary_large_image`.
- Eventos GA: `pix_view`, `pix_contribute_start`, `pix_contribute_success` (via webhook → nada; disparado no polling do checkout público).

## Notas técnicas
- Reutiliza padrão já existente de `pix_payments`/`apply_mercadopago_payment_update`; o novo webhook fica **em rota separada** para não conflitar com o de assinatura Pro.
- Slugs: validação server-side (`^[a-z0-9-]{3,40}$`), reservados (`admin`, `api`, etc.).
- Bucket `pix-covers` público para SELECT, escrita apenas do dono.
- Free vê botão "Fazer upgrade" ao tentar criar 2ª campanha.
- Templates Resend: `pix-new-contribution` (para o criador) e `pix-contribution-receipt` (para colaborador).

## Ordem de entrega
1. Migration (tabelas + RLS + grants + seed de `pix_config` e `pix_badges`) e bucket
2. OAuth Mercado Pago (server fn + callback + UI conectar/desconectar)
3. CRUD de campanhas + dashboard `/pix`
4. Página pública `/pix/<slug>` + criação de contribuição (PIX)
5. Webhook + aprovação + selos + mural em tempo real (Realtime)
6. Suporte a cartão (Checkout Pro) — opcional
7. Aba PIX no `/admin` (config global, selos, listagem)
8. Templates de e-mail Resend
