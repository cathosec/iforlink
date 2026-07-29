# Domínios personalizados para Pro (Cloudflare for SaaS)

Objetivo: permitir que usuários **Pro/Admin** conectem `dominiodele.com` (ou subdomínio como `links.dominiodele.com`) e sirvam sua página de perfil ForLink ali — com SSL automático via **Cloudflare Custom Hostnames** (SSL for SaaS), que você já habilitou.

Suporta dois modos:

- **Raiz/subdomínio inteiro** → serve o perfil em `/` (ex.: `fulano.com` = `forlink.app/fulano`)
- **Subpath opcional** → o próprio Worker roteia `/links` para o perfil, deixando outras rotas livres se o usuário quiser (fase 2)

---

## Fase 1 — Modelo de dados e painel

**Tabela nova `custom_domains`:**

- `user_id` (FK auth.users, dono Pro)
- `hostname` (ex.: `fulano.com` — único, lowercase)
- `mode` ('root' | 'subpath') — fase 1 só 'root'
- `path_prefix` (ex.: `/links`, nullable, só para 'subpath')
- `cf_custom_hostname_id` (id retornado pelo Cloudflare API)
- `status` ('pending_dns' | 'pending_ssl' | 'active' | 'failed' | 'removed')
- `ownership_verification` (jsonb — TXT/HTTP token do CF)
- `ssl_status`, `last_error`, timestamps

RLS: dono lê/escreve o próprio; admin lê tudo. Trigger que bloqueia criação se `get_user_role` ≠ pro/admin.

**Nova aba "Domínio próprio" em `/settings**` (bloqueada com `UpgradeGate` para Free):

- Input do hostname → cria linha e chama edge action que registra no CF for SaaS
- Mostra instruções DNS: `CNAME @ (ou subdomínio) → forlink.app` + registro TXT de verificação de propriedade
- Botão "Verificar agora" → refaz consulta de status no CF
- Cards de status com badges (DNS pendente / SSL emitindo / Ativo / Falhou) + botão remover

---

## Fase 2 — Integração Cloudflare API

Server functions autenticadas (`src/lib/custom-domains.functions.ts` + `.server.ts`) usando `CF_API_TOKEN` (novo secret com escopo *SSL Custom Hostnames Edit* na zona do `forlink.app`) e `CF_ZONE_ID`:

- `createCustomHostname(hostname)` → `POST /zones/:zone/custom_hostnames` com `ssl.method=http` (ou `txt` se raiz apex) e `ssl.type=dv`
- `getCustomHostname(id)` → polling de `status` e `ssl.status` para atualizar a linha
- `deleteCustomHostname(id)` → ao remover

Todas verificam `context.userId` + `has_role('pro')` e que o `hostname` pertence àquele user antes de qualquer chamada.

Cron leve (reaproveitando `/api/public/cron/*` com `CRON_SECRET`) que roda a cada 15 min varrendo domínios em `pending_*` e sincroniza status.

---

## Fase 3 — Roteamento das requisições

O request de `fulano.com` chega no Worker do ForLink pelo fallback origin do CF for SaaS. Precisamos resolver **Host → username** antes do TanStack Start decidir a rota.

Duas peças:

1. **Middleware no `src/start.ts` / entrada SSR** — lê `request.headers.host`:
  - Se host = `forlink.app`, `*.lovable.app`, ou preview → comportamento normal
  - Se host = domínio custom ativo → busca via RPC pública `resolve_custom_domain(hostname)` que retorna `{ username, path_prefix }`
  - Reescreve internamente para `/${username}` (ou `/${username}` quando o path bate com `path_prefix`) mantendo a URL visível intacta
2. **RPC nova `resolve_custom_domain(_hostname text)**` — `SECURITY DEFINER`, retorna username só se `status='active'`. Cacheável em memória do Worker por ~60s.

Ajustes no `$username.tsx`:

- `og:url` e canonical passam a usar o host do request quando for domínio custom (evita duplicidade SEO)
- `SiteHeader` continua exibido; adicionar flag `hideForBranding` opcional para futuro (não implementar agora)

---

## Fase 4 — SEO, sitemap e segurança

- `robots.txt` e `sitemap.xml` do ForLink continuam servindo só `forlink.app` — cada domínio custom serve sitemap próprio automaticamente do mesmo endpoint filtrado por host
- `Link` canônico aponta para o host custom quando ativo, então Google indexa lá e não como duplicata
- Rate-limit por hostname em `check_rate_limit` para evitar abuso na resolução
- Validação de hostname: regex estrito, bloquear `forlink.app`/subs, `lovable.app`, IPs, punycode inválido
- Log em `event_log` de criar/remover/ativar

---

## Detalhes técnicos

**Novos arquivos:**

- Migration: `custom_domains` + RPCs `resolve_custom_domain`, `admin_list_custom_domains`
- `src/lib/custom-domains.functions.ts` (CRUD do lado do usuário)
- `src/lib/custom-domains.server.ts` (fetch API Cloudflare, nunca no bundle client)
- `src/routes/api/public/cron/sync-custom-domains.ts` (polling de status)
- Nova seção em `src/routes/_authenticated/settings.tsx`
- Painel admin: linha nova em `/admin` listando domínios de todos os usuários
- Para que imagens, CSS, scripts e links da página carreguem corretamente sem quebrar os caminhos relativos:
  1. Ajuste de Asset Base Path: Todos os arquivos estáticos da página do perfil (estilos, ícones, JS) devem ser carregados usando caminhos absolutos apontando para o seu domínio principal (ex: ⁠[[https://forlink.app/assets/](https://forlink.app/assets/)...⁠](https://forlink.app/assets/](https://forlink.app/assets/)...⁠) em vez de ⁠/assets/...⁠).
  2. Suporte a Headers de Proxy: No seu Worker/Middleware, você pode verificar se a requisição traz o header ⁠X-Forwarded-Host⁠ ou ⁠Host⁠ original para renderizar os dados do usuário ⁠.

**Alterações:**

- `src/start.ts` / handler SSR: middleware de reescrita por Host
- `src/routes/$username.tsx`: canonical/`og:url` dinâmicos
- `src/routes/sitemap[.]xml.ts`: filtra por host quando custom

**Secrets novos (Cloudflare dashboard → API tokens):**

- `CF_API_TOKEN` (escopo: SSL Custom Hostnames Edit + Zone.Zone Read na zona forlink.app)
- `CF_ZONE_ID` (id da zona forlink.app)

**Fallback origin no Cloudflare (você faz uma vez, no dashboard):**

- SSL/TLS → Custom Hostnames → **Fallback Origin** = `forlink.app` (ou o hostname do Worker/CF Pages onde o app está publicado). Sem isso o tráfego do domínio custom não chega no Worker.

**Instruções DNS que o painel mostra ao usuário Pro:**

```text
Para apex (fulano.com):
  Tipo   Nome    Valor
  CNAME  @       forlink.app     (ou use "CNAME flattening" do seu DNS)

Para subdomínio (links.fulano.com):
  CNAME  links   forlink.app

Verificação de propriedade (temporária):
  TXT    _cf-custom-hostname.<host>   <token retornado pelo CF>
```

---

## Fora do escopo desta fase

- Emails no domínio do cliente (MX/SPF/DKIM próprios)
- Múltiplos domínios por usuário (fase 1 = 1 domínio por conta Pro)
- Editor de páginas fora de `/` no domínio custom (subpath rico) — só stub no schema
- Cobrança extra por domínio — hoje entra no plano Pro existente

## Ordem sugerida de execução

1. Migration + painel Pro (fase 1)
2. Integração Cloudflare + cron (fase 2)
3. Middleware de host no Worker + resolver RPC (fase 3)
4. SEO, admin, logs e rate-limit (fase 4)

Aprova para eu começar pela Fase 1?