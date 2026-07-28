
# ForLink Analytics — plano de construção

Módulo próprio de analytics, heatmaps e session replay, 100% integrado ao Supabase, sem serviços externos. Entregue em **6 fases** para permitir revisão a cada passo — o escopo total é grande demais para uma única entrega estável.

Objetivo: dashboards e coleta parecidos com Microsoft Clarity/GA4/Plausible, respeitando LGPD e o consentimento de cookies que já existe no site.

---

## Arquitetura (visão geral)

```text
Browser (todas as páginas)
  └─ src/lib/analytics/            (SDK <20KB)
       ├─ tracker (page views, tempo, idle, tab, custom)
       ├─ interactions (click, move, scroll)   ← throttle/debounce
       ├─ replay (rrweb + mascaramento)
       ├─ transport (batch 5s / 30 evts, sendBeacon + gzip)
       └─ consent-gate (respeita consent.ts existente)

Server (TanStack)
  └─ /api/public/analytics/ingest    (edge, POST em lote, valida payload)
  └─ /api/public/analytics/replay    (chunks rrweb)
  └─ src/lib/analytics/*.functions.ts (queries do dashboard)

Supabase
  ├─ Tabelas normalizadas (ver §Dados)
  ├─ RLS: admin do ForLink vê tudo; dono do perfil vê apenas eventos das próprias páginas públicas
  └─ Rollups agregados por materialized views + pg_cron

Dashboard
  └─ /_authenticated/analytics/*  (subrota com sidebar própria)
```

Desacoplado: nada existente é alterado. O único gancho fora do módulo é uma linha em `__root.tsx` que monta `<AnalyticsProvider />`, respeitando `hasAnalyticsConsent()`.

---

## Fases

### Fase 1 — Fundação (banco + ingest + SDK mínimo)
Entrega já visível como "page views por página" no admin.

- Migração com tabelas: `analytics_visitors`, `analytics_sessions`, `analytics_pageviews`, `analytics_events`, `analytics_custom_events`, `analytics_devices`, `analytics_pages`. RLS restritiva (admin e dono da página); grants explícitos; índices em `(session_id, ts)`, `(page_id, ts)`, `(visitor_id)`.
- Rota `/api/public/analytics/ingest` (rate-limit reaproveitando `check_rate_limit`; valida com Zod; deriva IP/UA server-side).
- SDK `src/lib/analytics/*` com: visitor id (localStorage) + session id (sessionStorage), pageview automático em cada navegação do router, tempo na página (visibility + beforeunload via `sendBeacon`), UA/idioma/tela/viewport, `track(name, props)`.
- Batch queue: 5s ou 30 eventos, gzip via CompressionStream, fallback `sendBeacon`.
- Consent-gate: nada roda sem `hasAnalyticsConsent()`; se rejeitado, apenas 1 pageview anônimo diário (sem cookies).
- Card "Analytics" no admin com totais brutos.

### Fase 2 — Interações + heatmaps
- Coleta de cliques (throttle 100ms), movimento do mouse (amostragem 50ms + agrupamento em grid 20px), profundidade de scroll (marcos 25/50/75/100%), idle (>30s sem input), troca de aba.
- Tabelas `analytics_heatmap_clicks`, `analytics_scroll_depth`, `analytics_mouse_moves` — todas agregadas por célula (`x_bucket, y_bucket, viewport_w`) para consultas O(1).
- Página `Analytics → Heatmaps`: seletor de página + período + dispositivo. Canvas desenha os pontos sobre um screenshot da página (screenshot gerado por rota `/api/public/analytics/snapshot/$page` usando `html2canvas` client-side, salva em Supabase Storage bucket privado `analytics-snapshots`).
- Legenda com escala 🔴🟠🟡🔵 baseada em quartis da distribuição de intensidade.

### Fase 3 — Session Replay (rrweb)
- Integrar `rrweb` como chunk lazy (só carrega após 2s idle da primeira interação, para não pesar no LCP).
- Mascaramento: `maskAllInputs`, `maskTextClass`, regex automática para CPF (`\d{3}\.\d{3}\.\d{3}-\d{2}`), cartão (Luhn de 13–19 dígitos), CVV, tokens (Bearer/JWT). Inputs `type=password|hidden` sempre mascarados. Toggle admin para mascarar e-mails.
- Chunks de replay em `analytics_replays` (jsonb + `chunk_seq`) via rota dedicada `/api/public/analytics/replay`.
- Player em `Analytics → Session Replay`: rrweb-player com Play/Pause, 1x/2x/4x, timeline com marcadores de clique/navegação/erro, lista lateral de eventos clicáveis que fazem seek.
- Retenção: 30 dias (Free) / 90 dias (Pro) via job `pg_cron` diário.

### Fase 4 — Dashboards
Sidebar do módulo (`/_authenticated/analytics/*`):

- **Visão Geral**: visitantes únicos, sessões, tempo médio, bounce rate, top páginas, mini heatmap agregado.
- **Usuários Online (tempo real)**: Supabase Realtime na tabela `analytics_sessions` filtrando `last_seen > now() - 30s`.
- **Eventos**: lista custom events + gráfico por tempo.
- **Páginas / Dispositivos / Navegadores / Origem do tráfego**: agregações materializadas.
- **Funis**: builder visual (arrastar passos: pageview:/x, event:signup, event:pix_paid); calcula % em cada etapa via CTE.
- **Conversões**: marca eventos como "goal" e mostra taxa por origem/página.

Estilo: cards + Recharts (já disponível), tema escuro respeitando design existente, responsivo.

### Fase 5 — Performance & robustez
- Web Worker para: gzip do payload, buffer de mousemove, cálculo de buckets de heatmap.
- `requestIdleCallback` para flushes não críticos.
- Materialized views `analytics_daily_page_stats`, `analytics_daily_device_stats` atualizadas por `pg_cron` a cada 10 min.
- Dedup de eventos por `client_event_id` (UUID gerado no cliente) → idempotência total.
- Bundle budget checado no CI: falha se `dist/analytics.*.js` > 20 KB gzip.

### Fase 6 — Segurança, LGPD e retenção
- Nada de PII: IP truncado (/24 IPv4, /48 IPv6), UA parseado e descartado.
- Auto-mask no ingest: regex de CPF/cartão/CVV/token/e-mail em campos livres.
- `/privacidade` e `/termos` atualizados descrevendo o módulo e a base legal (legítimo interesse + consentimento para replay).
- Botão "Excluir meus dados" no perfil → RPC apaga por `visitor_id`.
- Auditoria: cada acesso admin ao replay grava linha em `event_log` (`type='analytics.replay.viewed'`).

---

## Modelo de dados (resumido, para revisão técnica)

- `analytics_visitors(id, first_seen, last_seen, ua_hash)`
- `analytics_sessions(id, visitor_id, started_at, ended_at, last_seen, device, os, browser, lang, screen_w, screen_h, referrer, utm_*, owner_user_id)`
- `analytics_pageviews(id, session_id, page_id, url, path, title, ts, duration_ms, exit)`
- `analytics_events(id, session_id, type, ts, payload jsonb, client_event_id unique)` — tipos: click, scroll, idle, tab_hidden/visible, error
- `analytics_custom_events(id, session_id, name, ts, props jsonb)`
- `analytics_heatmap_clicks(page_id, device, x_bucket, y_bucket, viewport_w, count)` — PK composta
- `analytics_scroll_depth(page_id, device, depth_bucket, count)`
- `analytics_mouse_moves(page_id, device, x_bucket, y_bucket, viewport_w, count)`
- `analytics_replays(id, session_id, chunk_seq, events jsonb, created_at)`
- `analytics_pages(id, path unique, title, owner_user_id)` — resolve dono via lookup por username no path
- `analytics_devices(id, session_id, ua_family, os_family, device_type, is_mobile)`
- `analytics_funnels(id, owner_user_id, name, steps jsonb)` — Fase 4

RLS: admin (`has_role admin`) vê tudo; usuário autenticado vê apenas rows onde `owner_user_id = auth.uid()` (páginas do próprio perfil público). Ingest bypassa RLS via `SECURITY DEFINER RPC` que resolve o dono a partir do path.

---

## Decisões que preciso confirmar antes de começar

1. **Escopo por dono**: cada usuário Pro vê os analytics **apenas do próprio perfil público** (`/username`, `/pix/slug`, etc.) — ou o módulo é **admin-only** por enquanto? (Recomendo começar admin-only na Fase 1 e liberar por dono na Fase 4, mais barato.)
2. **Session replay para Free ou só Pro?** Replay é caro em storage; recomendo restringir a Pro.
3. **Screenshot da página**: usar `html2canvas` no navegador de quem visita (aumenta payload em ~30KB, chunked) ou renderizar sob demanda no admin usando o próprio DOM da página live? (Recomendo a 2ª — mais leve, mas o heatmap é sobre o layout atual, não histórico.)
4. Posso pular a **compressão via Web Worker na Fase 1** (usar apenas gzip nativo do browser) e só introduzir o worker na Fase 5?

---

## O que **não** faz parte deste plano
- Alterar código existente que não seja `__root.tsx` (uma linha para montar o Provider).
- Substituir o `analytics.ts` atual (será usado como shim que delega para o novo SDK).
- Geolocalização por cidade — requer base GeoIP; fica marcado como "quando disponível" via header `cf-ipcity` do Cloudflare, sem lookup próprio.

Quando você aprovar, começo pela **Fase 1** (migração + ingest + SDK mínimo + card no admin) — é o pedaço que já entrega valor sozinho e valida a arquitetura.
