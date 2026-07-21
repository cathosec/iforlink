import { createServerFn } from '@tanstack/react-start'
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
        return { sent: false as const, reason: result.reason }
      }
      return { sent: true as const }
    } catch (err) {
      console.error('[sendContactMessage] failed', err)
      throw new Error('Falha ao enviar a mensagem. Tente novamente em instantes.')
    }
  })
