import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/** Verifica se o caller é admin. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (error) throw new Error(error.message)
  if (!isAdmin) throw new Error('Acesso restrito a administradores')
}

/** Status da configuração (chave presente? valida na API do Resend?). */
export const getResendStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never)
    const apiKey = process.env.RESEND_API_KEY?.trim()
    if (!apiKey) return { ok: false, hasKey: false, message: 'RESEND_API_KEY não configurada' }

    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, hasKey: true, status: res.status, message: (body as { message?: string })?.message ?? res.statusText }
      }
      const domains =
        (body as { data?: Array<{ name: string; status: string; region?: string }> }).data ?? []
      return { ok: true, hasKey: true, domains }
    } catch (e) {
      return { ok: false, hasKey: true, message: e instanceof Error ? e.message : 'Erro desconhecido' }
    }
  })

/** Envia um e-mail de teste (usa template welcome). */
export const sendResendTest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { to: string }) => {
    const to = (data?.to ?? '').trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('E-mail inválido')
    return { to }
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never)
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
    const result = await sendTemplateEmail('welcome', data.to, {
      templateData: { displayName: 'Admin (teste)' },
      idempotencyKey: `resend-test-${Date.now()}`,
    })
    return result
  })
