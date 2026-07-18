import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Envia o e-mail de boas-vindas para o usuário autenticado.
 * Idempotente por user_id (Lovable dedupa via idempotency_key).
 */
export const sendWelcomeEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')

    const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(context.userId)
    const email = userRow?.user?.email
    if (!email) return { sent: false, reason: 'no_email' as const }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, display_name')
      .eq('id', context.userId)
      .maybeSingle()

    try {
      const res = await sendTemplateEmail('welcome', email, {
        idempotencyKey: `welcome-${context.userId}`,
        templateData: {
          displayName: profile?.display_name ?? undefined,
          username: profile?.username ?? undefined,
        },
      })
      return res
    } catch (err) {
      console.error('[sendWelcomeEmail] failed', err)
      return { sent: false, reason: 'error' as const }
    }
  })
