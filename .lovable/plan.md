
# Plano — Arquitetura ForLink

Objetivo: reduzir acoplamento, centralizar regras críticas (taxas/pagamentos) e ganhar observabilidade sem quebrar o que já funciona. Executar em 4 etapas independentes, cada uma entregável sozinha.

---

## Etapa 1 — Camada de domínio de pagamentos

Hoje a matemática de taxas e as chamadas ao Mercado Pago vivem em vários lugares (componente de checkout, server function, RPC SQL). Isso é a raiz dos bugs de valor divergente e de "pagou e não caiu".

**O que criar:**
- `src/lib/payments/fees.ts` — módulo puro, sem dependências. Funções: `computeCampaignFees({ baseCents, feePct, minFeeCents, mpPct, passToSupporter })` retornando `{ total, base, feeForLink, feeMp, netCreator }`. Importado tanto pelo componente de checkout quanto pelo server.
- `src/lib/payments/mercadopago.server.ts` — wrapper único das chamadas MP: `createPixPayment`, `createCardPayment`, `getPayment`, `reconcilePayment(mpPaymentId)`. Isola SDK e headers.
- `src/lib/payments/campaigns.functions.ts` — server functions que orquestram: `startContribution`, `pollContributionStatus`, `reconcileContribution`.
- Remover cálculos duplicados em `pix.$slug.tsx` e em RPCs. RPCs continuam responsáveis por persistência atômica; matemática vem do módulo TS.

**Critério de aceite:** um único ponto de mudança para regras de taxa; checkout mostra exatamente o que o server cobra.

---

## Etapa 2 — Views públicas + hardening de RLS

Reduzir superfície de exposição dos dados e simplificar policies.

**O que criar (migração SQL):**
- `v_campaign_public` — colunas seguras de `pix_campaigns` (sem `user_id`, sem tokens) + `show_progress`, `raised_cents` condicional.
- `v_profile_public` — colunas seguras de `profiles`.
- `v_link_public` — join de `links` + `user_categories` visíveis.
- Grants: `SELECT` para `anon` e `authenticated` somente nas views.
- Manter policies existentes nas tabelas base; front público passa a ler as views.

**Critério de aceite:** perfil, campanha e links públicos funcionam lendo só das views; nenhum campo sensível retornável via PostgREST anônimo.

---

## Etapa 3 — Observabilidade (event_log + logs estruturados)

Sem isso, todo bug em produção vira "achismo".

**O que criar:**
- Migração `event_log(id, type, actor_id, target_type, target_id, payload jsonb, level text, created_at)` — append-only, RLS: admin lê tudo, insert via RPC `log_event()` security definer.
- Helper `src/lib/observability/log.server.ts` com `logEvent(type, payload)`.
- Instrumentar pontos críticos: `payment.created`, `payment.approved`, `payment.reconciled`, `webhook.received`, `webhook.rejected`, `oauth.connected`, `oauth.failed`, `subscription.activated`, `limit.reached`.
- Página `/admin/eventos` com filtro por tipo/data e paginação — troubleshooting sem SSH.

**Critério de aceite:** consigo, no admin, ver a jornada completa de um pagamento em uma única tela.

---

## Etapa 4 — Feature flags + kill switches

Permitir desligar módulos instáveis sem deploy.

**O que criar:**
- Reutilizar `platform_settings` com chave `feature_flags`: `{ campaigns_enabled, cards_enabled, shortener_enabled, ads_enabled, oauth_mp_enabled }`.
- Helper `src/lib/flags.ts` com `useFlag(name)` no cliente e `getFlag(name)` no server.
- Painel `/admin/flags` com toggles.
- Aplicar guards em: página `/pix/$slug` (bloqueia se `campaigns_enabled=false` com mensagem amigável), botões de cartão, encurtador, componente `AdSlot`.

**Critério de aceite:** desligar "cartão" no admin faz o checkout ocultar cartão em 30s (revalidate cache) sem deploy.

---

## Ordem de execução recomendada

```text
Etapa 1 (fees + payments module)  ── 2-3 dias
   │
   ├── Etapa 3 (event_log)         ── 1-2 dias  ◄ paralelo ok
   │
   ├── Etapa 2 (views públicas)    ── 1 dia
   │
   └── Etapa 4 (feature flags)     ── 1 dia
```

Etapas 2, 3 e 4 são independentes entre si. Etapa 1 é pré-requisito para instrumentar corretamente os eventos de pagamento na Etapa 3.

---

## Detalhes técnicos

- **Zero breaking changes de schema**: nada é dropado. Colunas ficam; views são adicionais.
- **RPCs existentes** (`apply_mercadopago_payment_update`, `create_pending_pix_contribution` etc.) continuam intactas — a camada TS orquestra chamadas a elas.
- **Import graph seguro**: `mercadopago.server.ts` e `client.server` só importados dentro de `.handler()` de `createServerFn`, seguindo `tanstack-supabase-import-graph`.
- **Testes mínimos**: adicionar `src/lib/payments/fees.test.ts` cobrindo os 4 cenários (PIX/cartão × repassa/absorve taxa).
- **Nenhuma alteração em auth, OAuth PKCE, ou webhooks** nesta fase — foco em refatorar sem regressão.

---

## Fora do escopo desta fase

- Cron de reconciliação automática (fica para Sprint de Estabilidade).
- Sentry/monitoring externo (Estabilidade).
- Página `/precos` e trial Pro (Monetização).
- Rate limiting (Estabilidade).

Quando aprovar, começo pela Etapa 1 (módulo `fees.ts` + refactor do checkout) — é a de maior impacto imediato porque fecha os bugs de valores que você viu no PIX.
