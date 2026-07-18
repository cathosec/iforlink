import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from './registry'

// Server-only: uses Resend (https://resend.com). Configured via:
//   - env RESEND_API_KEY (secret)
//   - platform_settings key = 'email' (from address, reply-to, enabled) — managed at /admin.

const SITE_NAME_FALLBACK = 'ForLink'
const FROM_FALLBACK = 'ForLink <noreply@forlink.app>'

export type SendTemplateEmailResult =
  | { sent: true; id?: string }
  | { sent: false; reason: 'disabled' | 'no_api_key' | 'recipient_suppressed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, unknown>
  /** Dedupes retries of the same logical send (Resend Idempotency-Key). */
  idempotencyKey?: string
  replyTo?: string
}

interface EmailSettings {
  enabled?: boolean
  from_name?: string
  from_address?: string
  reply_to?: string
  api_key?: string
}

async function loadSettings(): Promise<EmailSettings> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'email')
      .maybeSingle()
    if (error) {
      console.error('[email] loadSettings error:', error.message)
      return {}
    }
    return ((data?.value ?? {}) as EmailSettings) || {}
  } catch (e) {
    console.error('[email] loadSettings exception:', e instanceof Error ? e.message : String(e))
    return {}
  }
}


function resolveFrom(s: EmailSettings): string {
  const addr = (s.from_address ?? '').trim()
  const name = (s.from_name ?? SITE_NAME_FALLBACK).trim() || SITE_NAME_FALLBACK
  if (!addr) return FROM_FALLBACK
  return addr.includes('<') ? addr : `${name} <${addr}>`
}

/**
 * Envia um template pelo Resend. Falhas HTTP viram Error com o corpo da API.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const settings = await loadSettings()
  const apiKey = (settings.api_key ?? process.env.RESEND_API_KEY ?? '').trim()
  if (!apiKey) {
    console.warn('[email] Resend API key não configurada — envio ignorado')
    return { sent: false, reason: 'no_api_key' }
  }

  if (settings.enabled === false) {
    return { sent: false, reason: 'disabled' }
  }


  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' não encontrado. Disponíveis: ${Object.keys(TEMPLATES).join(', ')}`,
    )
  }

  const recipient = template.to || to
  if (!recipient) throw new Error('Destinatário obrigatório')

  const templateData = options.templateData ?? {}
  const element = React.createElement(
    template.component as React.ComponentType<Record<string, unknown>>,
    templateData,
  )
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? (template.subject as (d: Record<string, unknown>) => string)(templateData)
      : template.subject

  const payload: Record<string, unknown> = {
    from: resolveFrom(settings),
    to: [recipient],
    subject,
    html,
    text,
    tags: [{ name: 'template', value: templateName.replace(/[^a-zA-Z0-9_-]/g, '_') }],
  }
  const replyTo = options.replyTo ?? settings.reply_to
  if (replyTo) payload.reply_to = replyTo

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${body || res.statusText}`)
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string }
  return { sent: true, id: json.id }
}
