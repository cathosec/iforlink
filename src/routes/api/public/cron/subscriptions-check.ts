import { createFileRoute } from '@tanstack/react-router'

/**
 * Cron endpoint — chamar diariamente.
 *
 * - Envia aviso de vencimento próximo (3 dias antes) uma única vez por
 *   assinatura, usando idempotency_key derivado do id + data.
 * - Marca como expirada e rebaixa o usuário para "free" quando o período
 *   termina, disparando o e-mail "subscription-expired".
 *
 * Chame com header Authorization: Bearer <CRON_SECRET> ou query ?secret=...
 * Configure em pg_cron ou serviço externo (ex.: cron-job.org).
 */
export const Route = createFileRoute('/api/public/cron/subscriptions-check')({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
})

async function handle(request: Request) {
  const url = new URL(request.url)
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected) return new Response('cron not configured', { status: 500 })

  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const basicPassword = getBasicAuthPassword(auth)
  const headerSecret = request.headers.get('x-cron-secret')?.trim() ?? ''
  const querySecret = (url.searchParams.get('secret') ?? url.searchParams.get('token') ?? '').trim()
  if (
    bearer !== expected &&
    basicPassword !== expected &&
    headerSecret !== expected &&
    querySecret !== expected
  ) {
    return Response.json(
      {
        ok: false,
        error: 'unauthorized',
        accepted_auth: ['?secret=CRON_SECRET', 'Authorization: Bearer CRON_SECRET', 'Basic Auth password = CRON_SECRET'],
      },
      { status: 401 },
    )
  }

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')

  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 86400_000)
  const in4Days = new Date(now.getTime() + 4 * 86400_000)

  const results = {
    expiring_notified: 0,
    expired_processed: 0,
    errors: 0,
  }

  // 1) EXPIRING SOON — vence nos próximos 3–4 dias
  const { data: expiring } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, interval, current_period_end')
    .eq('status', 'active')
    .gte('current_period_end', in3Days.toISOString())
    .lt('current_period_end', in4Days.toISOString())

  for (const sub of expiring ?? []) {
    try {
      const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
      const email = userRow?.user?.email
      if (!email) continue
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('display_name').eq('id', sub.user_id).maybeSingle()

      const dayKey = (sub.current_period_end ?? '').slice(0, 10)
      await sendTemplateEmail('subscription-expiring', email, {
        idempotencyKey: `sub-expiring-${sub.id}-${dayKey}`,
        templateData: {
          displayName: profile?.display_name ?? undefined,
          interval: sub.interval,
          periodEnd: sub.current_period_end,
          daysLeft: 3,
        },
      })
      results.expiring_notified += 1
    } catch (err) {
      console.error('[cron] expiring notify failed', err)
      results.errors += 1
    }
  }

  // 2) EXPIRED — período terminado, ainda ativas
  const { data: expired } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id')
    .eq('status', 'active')
    .lt('current_period_end', now.toISOString())

  for (const sub of expired ?? []) {
    try {
      // Downgrade
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'expired', canceled_at: now.toISOString() })
        .eq('id', sub.id)

      // Only downgrade role if the user has no other active pro sub
      const { data: stillActive } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('status', 'active')
        .limit(1)

      if (!stillActive || stillActive.length === 0) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', sub.user_id)
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: sub.user_id, role: 'free' })
      }

      const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
      const email = userRow?.user?.email
      if (email) {
        const { data: profile } = await supabaseAdmin
          .from('profiles').select('display_name').eq('id', sub.user_id).maybeSingle()
        await sendTemplateEmail('subscription-expired', email, {
          idempotencyKey: `sub-expired-${sub.id}`,
          templateData: { displayName: profile?.display_name ?? undefined },
        })
      }
      results.expired_processed += 1
    } catch (err) {
      console.error('[cron] expire process failed', err)
      results.errors += 1
    }
  }

  return Response.json({ ok: true, ...results })
}

function getBasicAuthPassword(authorizationHeader: string) {
  if (!authorizationHeader.startsWith('Basic ')) return ''

  try {
    const decoded = atob(authorizationHeader.slice(6))
    const [, password = ''] = decoded.split(':')
    return password.trim()
  } catch {
    return ''
  }
}
