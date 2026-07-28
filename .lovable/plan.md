
# Plano de Estabilidade — ForLink

Objetivo: reduzir incidentes silenciosos, tornar pagamentos idempotentes e auditáveis, garantir que deploys no Cloudflare não quebrem assets/secrets, e criar visibilidade operacional. Cada fase é entregável isoladamente e não quebra o que já está no ar.

---

## Fase 1 — Pagamentos idempotentes e auto-reconciliação

**Por quê:** hoje já houve casos de pagamento aprovado sem confirmação automática, exigindo reconciliação manual. O webhook do Mercado Pago pode chegar duplicado, fora de ordem ou nunca chegar.

Entregas:
- Tabela `webhook_events(provider, event_id, payload, received_at, processed_at, status)` com `UNIQUE(provider, event_id)` — descarta duplicatas antes de qualquer efeito colateral.
- Refatorar `/api/public/webhooks/mercadopago` e `mp-pix` para: (1) gravar evento cru, (2) processar em transação, (3) marcar `processed_at`. Falha → mantém `status='pending'` para retry.
- Cron `reconcile-pending-payments` (a cada 10 min) varre `pix_payments` e `subscriptions` com status `pending` há mais de 5 min e consulta a API do MP diretamente — resolve caso o webhook nunca chegue.
- Verificação de assinatura HMAC do webhook do MP (`x-signature` header) — hoje qualquer POST na URL é aceito.
- Log estruturado em `event_log` de cada transição de estado (`payment.received`, `payment.approved`, `payment.reconciled_by_cron`).

---

## Fase 2 — Resiliência de assets e deploy no Cloudflare

**Por quê:** a cada deploy imagens quebravam, secrets sumiam, e a solução tem sido manual. Precisamos que o deploy seja determinístico.

Entregas:
- Auditoria: listar todos os assets em `public/brand/` referenciados no código e garantir que usam caminho relativo (`/brand/x.webp`), nunca CDN pointer instável.
- Health-check em `/api/public/health` retornando `{ ok, commit, env_ok, supabase_ok, mp_configured }` — chamado pelo próprio painel admin e por um cron externo (UptimeRobot/BetterStack) para alerta.
- Documento `docs/deploy.md` listando os secrets obrigatórios (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY, MP_CLIENT_ID/SECRET, MP_WEBHOOK_SECRET) e o comando `wrangler secret put` para cada um — evita esquecimento em deploy novo.
- Guard no boot da app: se secret crítico faltar em produção, a home renderiza uma página de manutenção controlada em vez de 500 opaco.
- Migrar cover de campanha e avatares que ainda usem caminho instável para Supabase Storage com URL assinada de longa duração ou bucket público estável.

---

## Fase 3 — Observabilidade e alertas

**Por quê:** hoje só descobrimos problema quando o usuário reclama. `event_log` já existe (Fase 1 da arquitetura), mas ninguém olha.

Entregas:
- Nova aba **Operações** em `/admin`: últimos 100 eventos com filtro por `level` (error/warn), taxa de erro nas últimas 24h, top 10 rotas com erro, últimos webhooks recebidos e status.
- RPC `admin_ops_summary` (SECURITY DEFINER + `has_role admin`) agregando dados de `event_log` + `webhook_events` + `cron.job_run_details`.
- Envio de e-mail para o super admin quando: (a) mais de 5 erros do mesmo tipo em 10 min, (b) cron falha 2x seguidas, (c) pagamento fica `pending` há mais de 30 min. Reaproveita infra de e-mail transacional já existente.
- Cliente: `reportLovableError` já captura React errors; adicionar hook para erros em `useServerFn` — mandar para `event_log` com contexto (rota, userId, mensagem).

---

## Fase 4 — Rate limiting e proteção contra abuso

**Por quê:** endpoints públicos (encurtador, criação de conta, reserva de username, contato) hoje não têm limite. Um bot pode esgotar slugs ou floodar o formulário de contato.

Entregas:
- Tabela `rate_limit_hits(key, window_start, count)` + função `check_rate_limit(_key, _limit, _window_seconds)` em Postgres.
- Aplicar em: reserva de username (5/min por IP), contato (3/hora por IP), criação de encurtador para não-logados se aplicável, callback OAuth do MP (10/min por user).
- Bloqueio suave: retorna 429 amigável com "Tente novamente em Xs" em vez de 500.
- Captcha (hCaptcha ou Turnstile Cloudflare — já estamos no CF) no formulário de contato e cadastro se o IP tiver ≥3 falhas em 1h.

---

## Fase 5 — Testes de regressão dos fluxos críticos

**Por quê:** hoje toda mudança em `pix.functions.ts` ou nos webhooks é validada manualmente. Isso não escala e já causou regressões (fee gross-up, aplicação de comissão).

Entregas:
- Suíte de testes unitários com Vitest para `src/lib/payments/fees.ts` cobrindo: Free vs Pro, gross-up PIX/cartão, valor mínimo, absorção vs repasse.
- Testes de integração para os webhooks usando MP payload de exemplo — garantir idempotência, tolerância a evento duplicado, tolerância a evento fora de ordem.
- Smoke test end-to-end com Playwright: cadastro → criar link → tornar público → visitar perfil → clicar link. Rodar em CI a cada PR e após deploy em produção contra a URL real.
- Bloquear merge se testes de `fees.ts` e webhooks falharem.

---

## Ordem sugerida

1. **Fase 1** — pagamento é o núcleo do negócio; incidente aqui = perda de receita e confiança.
2. **Fase 2** — o problema de deploy já é recorrente e afeta imagem publicada.
3. **Fase 3** — depois de 1 e 2, começa a valer a pena olhar métricas.
4. **Fase 4** — proteção pró-ativa quando o tráfego aumentar.
5. **Fase 5** — investimento de longo prazo em segurança de refatoração.

## Detalhes técnicos

- Nenhuma mudança quebra fluxo existente: novas tabelas com default, novos crons pausados até configurar, webhook antigo continua respondendo enquanto o novo modelo é implantado atrás.
- Toda RPC nova segue padrão: RLS + GRANT explícito + SECURITY DEFINER só quando expor agregado a admin.
- Cron jobs usam `pg_cron` com `apikey` header (padrão do projeto), sem novos segredos.
- Testes rodam em Vitest (`bunx vitest run`); Playwright roda em CI separado para não quebrar dev local.

Confirma que sigo pela **Fase 1 (pagamentos idempotentes + reconciliação automática)** primeiro?
