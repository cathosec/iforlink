## ForLink — Plataforma de Bio-Link e Agregador (pt-BR)

Plataforma completa em português, com Supabase (auth + RLS), TanStack Start, Tailwind, shadcn/ui e Lucide.

### 1. Banco de dados (migração Supabase)

Enum `app_role`: `free`, `pro`, `admin`.

Tabelas:
- **profiles**: `id` (FK auth.users), `username` (único, slug), `display_name`, `bio`, `avatar_url`, `is_verified` (bool), `views_count`, `created_at`.
- **user_roles**: `id`, `user_id`, `role app_role` — roles em tabela separada (evita escalação de privilégio).
- **user_categories**: `id`, `user_id`, `name`, `display_order`, `is_visible`, `created_at`.
- **links**: `id`, `user_id`, `category_id`, `title`, `description`, `url`, `favicon_url`, `clicks_count`, `is_visible`, `display_order`, `created_at`.

Funções/triggers:
- `has_role(user_id, role)` SECURITY DEFINER.
- `handle_new_user()` trigger em `auth.users` → cria profile + role `free`.
- `increment_link_click(link_id)` RPC pública (SECURITY DEFINER) para contador.

RLS (com GRANTs `anon`/`authenticated`):
- `profiles`: SELECT público de todos; UPDATE apenas o dono; admin tudo.
- `user_categories` e `links`: SELECT público quando `is_visible = true` (join com profile); dono lê/escreve os seus; admin tudo.
- `user_roles`: SELECT autenticado próprio; admin gerencia.

Seed: 3 perfis mock (`tech-curator`, `design-inspo`, `daily-reads`) com categorias e links reais (GitHub, Figma, Vercel, etc.) já com favicon_url preenchido.

### 2. Rotas (TanStack Start)

Públicas:
- `/` — Diretório: hero com busca global, grid de perfis em destaque, categorias curadas.
- `/auth` — Login/cadastro (email/senha).
- `/$username` — Perfil público: header (avatar, nome, bio, badge Pro, botão copiar link), categorias em accordion, itens com favicon + título + descrição + tracker de clique.

Protegidas (`_authenticated/`):
- `/_authenticated/dashboard` — Gestão de categorias e links (CRUD, toggle visibilidade, reordenar com setas ↑↓, limites Free/Pro exibidos), preview ao vivo.
- `/_authenticated/settings` — Edição de perfil (username, nome, bio, avatar).
- `/_authenticated/admin` — Painel admin (gate por `has_role admin`): lista usuários, alterna Free/Pro/verificado, métricas globais.

### 3. Favicon Fetcher

Utilitário `getFaviconUrl(url)` que gera `https://www.google.com/s2/favicons?sz=64&domain={host}`. Preview em tempo real no form (atualiza a cada digitação de URL válida). Salvo em `links.favicon_url` no submit.

### 4. Regras de negócio

- Limites Free (3 categorias / 15 links) validados no cliente + trigger no banco que bloqueia insert quando role = free e limite atingido.
- Badge "Verificado" exibido apenas quando `is_verified = true` (admin controla).
- Contador de cliques via RPC `increment_link_click` chamado no `onClick` do link antes do `window.open`.

### 5. Design (pt-BR, minimalista premium)

- Paleta: fundo off-white, acento índigo profundo, tipografia sans moderna (system stack via Tailwind).
- Tokens semânticos em `src/styles.css` (sem cores hardcoded).
- Componentes shadcn: Button, Input, Card, Accordion, Dialog, Sheet, Tabs, Badge, Avatar, Switch, DropdownMenu, Toast (sonner).
- Empty states ilustrados com ícone Lucide + CTA claro.
- Todo texto de UI em português (Painel, Categorias, Links, Publicar, Rascunho, Copiar link, etc.).

### 6. Metadata

`__root.tsx` com título "ForLink — Seu link na bio, organizado" e descrição pt-BR; OG tags. Favicon deixado no padrão (sem brand mark ainda).

### 7. Entregável

Após implementar, os 3 perfis mock estarão acessíveis em `/tech-curator`, `/design-inspo`, `/daily-reads` para validar visualmente a estrutura antes mesmo de cadastrar um usuário real.
