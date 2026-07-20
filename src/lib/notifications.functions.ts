import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Fires:
 *  - `welcome`  → to the newly signed-up user (once, gated by recent auth.users.created_at)
 *  - `admin-new-signup` → to the admin address configured in platform_settings.email.admin_notify_to
 *
 * Idempotency keys guarantee that Resend never sends the same welcome/notification twice
 * for the same user, even if the client fires this multiple times.
 */
export const sendWelcomeEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')

    const ctx = context as {
      supabase: any
      userId: string
      claims?: { email?: string }
      accessToken?: string
    }

    let email = ctx.claims?.email
    let createdAtIso: string | undefined
    if (ctx.accessToken) {
      const { data } = await ctx.supabase.auth.getUser(ctx.accessToken)
      email = email || data.user?.email
      createdAtIso = data.user?.created_at
    }
    if (!email) return { sent: false, reason: 'no_email' as const }

    // Gate: only send welcome + admin-new-signup for genuinely new accounts
    // (created within the last 24h). Prevents admins/old users from getting a
    // welcome every time they sign in and prevents duplicate admin alerts.
    if (createdAtIso) {
      const ageMs = Date.now() - new Date(createdAtIso).getTime()
      if (ageMs > 24 * 60 * 60 * 1000) {
        return { sent: false, reason: 'not_new_user' as const }
      }
    }

    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', ctx.userId)
      .maybeSingle()

    // 1) Welcome to the subscriber themselves.
    try {
      await sendTemplateEmail('welcome', email, {
        idempotencyKey: `welcome-${ctx.userId}`,
        settingsClient: ctx.supabase,
        templateData: {
          displayName: profile?.display_name ?? undefined,
          username: profile?.username ?? undefined,
        },
      })
    } catch (err) {
      console.error('[sendWelcomeEmail] welcome failed', err)
    }

    // 2) Admin notification: new signup.
    try {
      const { data: adminEmail } = await ctx.supabase.rpc('get_admin_notify_email' as never)
      const adminTo = typeof adminEmail === 'string' ? adminEmail.trim() : ''
      if (adminTo) {
        await sendTemplateEmail('admin-new-signup', adminTo, {
          idempotencyKey: `admin-new-signup-${ctx.userId}`,
          settingsClient: ctx.supabase,
          templateData: {
            email,
            displayName: profile?.display_name ?? undefined,
            username: profile?.username ?? undefined,
            createdAt: createdAtIso ?? new Date().toISOString(),
          },
        })
      }
    } catch (err) {
      console.error('[sendWelcomeEmail] admin notify failed', err)
    }

    return { sent: true as const }
  })
