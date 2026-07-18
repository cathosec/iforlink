import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/** Verifica se o caller é admin. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (error) throw new Error(`has_role: ${error.message}`)
  if (!isAdmin) throw new Error('Acesso restrito a administradores')
}

/** Lê a chave da Resend do platform_settings usando o próprio client autenticado (RLS admin). */
async function loadApiKey(supa: any): Promise<string> {
  const { data, error } = await supa
    .from('platform_settings')
    .select('value')
    .eq('key', 'email')
    .maybeSingle()
  if (error) throw new Error(`platform_settings: ${error.message}`)
  const cfg = (data?.value ?? {}) as { api_key?: string }
  return (cfg?.api_key ?? '').trim()
}

/** Status da configuração (chave presente? valida na API do Resend?). */
export const getResendStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never)
    const apiKey = await loadApiKey((context as never as { supabase: any }).supabase)
    if (!apiKey) {
      return { ok: false as const, hasKey: false, message: 'Chave da Resend não configurada' }
    }

    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const text = await res.text()
      let body: any = {}
      try { body = text ? JSON.parse(text) : {} } catch { body = { message: text } }
      if (!res.ok) {
        return {
          ok: false as const,
          hasKey: true,
          status: res.status,
          message: body?.message ?? body?.name ?? res.statusText ?? 'Erro na API do Resend',
        }
      }
      const domains =
        (body as { data?: Array<{ name: string; status: string; region?: string }> }).data ?? []
      return { ok: true as const, hasKey: true, domains }
    } catch (e) {
      return {
        ok: false as const,
        hasKey: true,
        message: e instanceof Error ? e.message : 'Erro de rede ao consultar Resend',
      }
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
