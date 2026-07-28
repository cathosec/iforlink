import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(100),
  email: z.string().trim().email('E-mail inválido').max(200),
  subject: z.string().trim().min(3, 'Informe o assunto').max(150),
  message: z.string().trim().min(10, 'Mensagem muito curta').max(4000),
  // Honeypot: bots preenchem este campo oculto.
  website: z.string().max(0).optional().or(z.literal('')),
})

export const sendContactMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    if (data.website && data.website.length > 0) {
      // Silenciosamente ignora spam.
      return { sent: true as const }
    }

    // Rate limit: 3 mensagens por 10 min por IP + 3 por 10 min por e-mail.
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
      const checks = await Promise.all([
        supabaseAdmin.rpc('check_rate_limit' as never, {
          _bucket: 'contact_ip', _subject: ip, _max: 3, _window_seconds: 600,
        } as never),
        supabaseAdmin.rpc('check_rate_limit' as never, {
          _bucket: 'contact_email', _subject: data.email.toLowerCase(), _max: 3, _window_seconds: 600,
        } as never),
      ])
      const allowed = checks.every((r) => r.data === true)
      if (!allowed) {
        throw new Error('Muitas tentativas. Aguarde alguns minutos antes de enviar novamente.')
      }
    } catch (err) {
      // Se o rate limit não estiver disponível, deixa passar (fail-open) mas loga.
      if (err instanceof Error && err.message.startsWith('Muitas tentativas')) throw err
      console.warn('[sendContactMessage] rate_limit unavailable', err)
    }


    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')

    try {
      const result = await sendTemplateEmail('contact-message', 'guthierresc@hotmail.com', {
        replyTo: data.email,
        idempotencyKey: `contact-${data.email}-${Date.now()}`,
        templateData: {
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          sentAt: new Date().toISOString(),
        },
      })
      if (!result.sent) {
        console.error('[sendContactMessage] not sent, reason:', result.reason)
        const messages: Record<string, string> = {
          no_api_key: 'Sistema de e-mails não configurado. Avise o administrador.',
          disabled: 'O envio de e-mails está temporariamente desativado.',
          recipient_suppressed: 'Não foi possível enviar sua mensagem (destinatário bloqueado).',
        }
        throw new Error(messages[result.reason] ?? 'Não foi possível enviar sua mensagem agora.')
      }
      return { sent: true as const }
    } catch (err) {
      console.error('[sendContactMessage] failed', err)
      const raw = err instanceof Error ? err.message : String(err)
      throw new Error(raw || 'Falha ao enviar a mensagem. Tente novamente em instantes.')
    }
  })
