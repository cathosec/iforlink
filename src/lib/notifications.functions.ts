import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Envia o e-mail de boas-vindas para o usuário autenticado.
 * Idempotente por user_id (Lovable dedupa via idempotency_key).
 */
export const sendWelcomeEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')

    const ctx = context as {
      supabase: typeof context.supabase
      userId: string
      claims?: { email?: string }
      accessToken?: string
    }
    let email = ctx.claims?.email
    if (!email && ctx.accessToken) {
      const { data } = await ctx.supabase.auth.getUser(ctx.accessToken)
      email = data.user?.email
    }
    if (!email) return { sent: false, reason: 'no_email' as const }

    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', ctx.userId)
      .maybeSingle()

    try {
      const res = await sendTemplateEmail('welcome', email, {
        idempotencyKey: `welcome-${ctx.userId}`,
        settingsClient: ctx.supabase,
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
