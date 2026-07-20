import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles, formatBRL, INTERVAL_LABEL_PT } from './_layout'

interface Props {
  email: string
  displayName?: string
  username?: string
  amountCents: number
  interval: string
  paidAt?: string
  paymentId?: string
}

const Email = ({
  email,
  displayName,
  username,
  amountCents,
  interval,
  paidAt,
  paymentId,
}: Props) => {
  const when = paidAt ? new Date(paidAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')
  return (
    <EmailShell
      preview={`Nova assinatura Pro: ${email}`}
      tagline="Admin · Nova assinatura"
    >
      <Text style={styles.h1}>Nova assinatura Pro 💙</Text>
      <Text style={styles.p}>
        Um usuário acabou de ativar o <strong>ForLink Pro</strong>. Detalhes do pagamento:
      </Text>
      <div style={styles.card}>
        <Text style={styles.cardRow}>
          Assinante: <span style={styles.cardValue}>{email}</span>
        </Text>
        {displayName ? (
          <Text style={styles.cardRow}>
            Nome: <span style={styles.cardValue}>{displayName}</span>
          </Text>
        ) : null}
        {username ? (
          <Text style={styles.cardRow}>
            Perfil: <span style={styles.cardValue}>forlink.app/{username}</span>
          </Text>
        ) : null}
        <Text style={styles.cardRow}>
          Plano: <span style={styles.cardValue}>{INTERVAL_LABEL_PT[interval] ?? interval}</span>
        </Text>
        <Text style={styles.cardRow}>
          Valor: <span style={styles.cardValue}>{formatBRL(amountCents)}</span>
        </Text>
        <Text style={styles.cardRow}>
          Pago em: <span style={styles.cardValue}>{when}</span>
        </Text>
        {paymentId ? (
          <Text style={styles.cardRow}>
            ID Mercado Pago: <span style={styles.cardValue}>{paymentId}</span>
          </Text>
        ) : null}
      </div>
      <Text style={styles.p}>
        Aviso automático enviado a partir do painel administrativo.
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => `Nova assinatura Pro · ${d.email ?? ''}`,
  displayName: 'Admin · Nova assinatura Pro',
  previewData: {
    email: 'ana@example.com',
    displayName: 'Ana',
    username: 'ana',
    amountCents: 1500,
    interval: 'month',
    paidAt: new Date().toISOString(),
    paymentId: '168853071255',
  },
} satisfies TemplateEntry
