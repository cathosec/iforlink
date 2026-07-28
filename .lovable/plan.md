
# Plano de Monetização — ForLink

Objetivo: aumentar a conversão Free → Pro, diversificar receitas (assinaturas + comissões + anúncios + add-ons) e dar visibilidade financeira ao super admin. Tudo governado por feature flags já criadas na Fase 4.

---

## Fase 1 — Página de Preços dedicada (`/precos`)

**Por que:** hoje os planos aparecem só na home. Uma página própria melhora SEO ("forlink preço", "bio link brasil"), permite comparação lado a lado e é o destino natural dos CTAs de upgrade.

Entregas:
- Rota `src/routes/precos.tsx` com hero, tabela comparativa Free × Pro, FAQ de cobrança, selo "pagamento via PIX/Cartão", prova social (nº de criadores, doações processadas — vindo de `event_log`).
- Toggle mensal/trimestral/anual com badge "economize X%".
- Botão "Assinar Pro" abre modal de checkout PIX já existente (`pix_payments`) e, quando `card_enabled`, cartão.
- SEO: JSON-LD `Product` + `Offer`, meta próprio, entrada no `sitemap.xml`.
- Link na navbar e no rodapé.

---

## Fase 2 — CTAs de upgrade contextuais

**Por que:** o usuário Free só descobre limites quando bate no erro. Precisamos empurrar Pro no momento certo, sem ser invasivo.

Entregas:
- Componente `<UpgradeNudge context="links|campaigns|shortener|ads" />` reutilizável, respeita flag `pro_upgrade_enabled`.
- Dashboard: banner discreto quando o usuário está a ≥80% do limite (15 links, 1 campanha).
- Ao tentar criar 16º link / 2ª campanha / usar encurtador no Free: modal explicativo com botão "Assinar Pro" (em vez do toast de erro atual).
- Perfil público: rodapé "Criado com ForLink — crie o seu grátis" só para perfis Free (Pro remove; já é benefício listado).
- Métrica: cada clique dispara `log_event('upgrade_cta_click', { context })` para medir conversão por origem.

---

## Fase 3 — Comissões dinâmicas por plano

**Por que:** hoje a comissão de Campanhas é global (2% ou R$0,50). Diferenciar por plano transforma o Pro em economia real para quem arrecada.

Entregas:
- Migração: adicionar `platform_settings.key = 'campaign_fees'` com estrutura `{ free: { pct, min_cents }, pro: { pct, min_cents } }`. Default sugerido: Free 4%/R$0,50, Pro 1%/R$0,25.
- `src/lib/payments/fees.ts`: função `getCampaignFeeForUser(userId)` consulta o plano do dono e devolve a taxa correta.
- Admin `/admin`: substituir os dois campos atuais por matriz Free/Pro com preview de exemplo (R$10, R$50, R$100).
- Página da campanha: mostrar "Taxa reduzida — criador Pro" quando aplicável (reforça valor do Pro).
- Backfill: manter valores atuais como Free para não quebrar campanhas existentes.

---

## Fase 4 — Add-ons e receita recorrente extra

**Por que:** nem todo usuário quer Pro completo; alguns querem só um recurso. Add-ons aumentam ARPU e destravam Pro pra quem hesita.

Entregas (todos gated por flag):
- **Domínio personalizado** (`custom_domain`): campo no perfil Pro + tabela `custom_domains(user_id, domain, verified_at, txt_token)`. Cobrança separada ou incluída no Pro anual.
- **Remover marca "Criado com ForLink"** do perfil: incluso no Pro; add-on avulso R$X/mês pro Free (opcional).
- **Analytics avançado**: página `/dashboard/analytics` com gráficos por link/dia/origem — Pro-only. Reaproveita `event_log`.
- **Tema premium**: 3-5 presets de cores/fontes para o perfil público, Pro-only.
- Registrar cada add-on como linha em `subscriptions` (campo `addon_key`) para o cron de renovação já existente cobrir.

---

## Fase 5 — Painel financeiro do super admin

**Por que:** sem visibilidade da receita, não dá para iterar preços. Precisamos de MRR, churn e comissões arrecadadas em um lugar.

Entregas:
- Rota `src/routes/_authenticated/financeiro.tsx` (admin only).
- Cards: MRR, ARR, assinantes Pro ativos, novos no mês, churn %, receita de comissões (mês/total), ticket médio das campanhas.
- Gráfico últimos 12 meses (assinaturas + comissões empilhadas).
- Tabela "Top campanhas por volume" e "Top criadores por receita gerada à plataforma".
- Export CSV do período.
- Fonte: queries agregadas em `subscriptions`, `pix_payments`, `pix_contributions` via RPC `admin_financial_summary` (SECURITY DEFINER + check `has_role admin`).

---

## Ordem sugerida de execução

1. Fase 1 (Preços) — base de todos os CTAs.
2. Fase 2 (CTAs) — conversão imediata sem migração.
3. Fase 5 (Painel financeiro) — para medir o impacto das fases 1–2 antes de mexer em preço.
4. Fase 3 (Comissões dinâmicas) — decisão de precificação baseada em dados da Fase 5.
5. Fase 4 (Add-ons) — expansão de ARPU depois do funil básico estar afiado.

## Detalhes técnicos

- Todas as novas tabelas/RPCs seguem o padrão da Fase 1–3 (RLS + GRANT + SECURITY DEFINER quando expor dados agregados).
- Nada quebra usuários existentes: novos campos com default, flags iniciam ligadas apenas quando a fase for entregue.
- Instrumentação `log_event` obrigatória em: view de `/precos`, clique em CTA, início de checkout, sucesso de pagamento, cancelamento — alimenta a Fase 5.
- Sem alterações no fluxo Mercado Pago já estável; comissões dinâmicas só trocam o número passado em `application_fee`.

Confirma que sigo por essa ordem (começando pela Fase 1 — página `/precos`)?
