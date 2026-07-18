import * as React from 'react'
import { Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles, formatDateBR, INTERVAL_LABEL_PT } from './_layout'

interface Props {
  displayName?: string
  interval?: string
  periodEnd?: string
  daysLeft?: number
}

const Email = ({ displayName, interval, periodEnd, daysLeft }: Props) => {
  const name = displayName || 'você'
  const days = typeof daysLeft === 'number' ? daysLeft : 3
  return (
    <EmailShell
      preview={`Sua assinatura ForLink Pro vence em ${days} dias`}
      tagline="Aviso de vencimento"
    >
      <Text style={styles.h1}>
        Sua assinatura Pro vence em {days} {days === 1 ? 'dia' : 'dias'}
      </Text>
      <Text style={styles.p}>
        Olá, {name}. Passando para avisar que sua assinatura{' '}
        <strong>ForLink Pro</strong>{' '}
        {interval ? INTERVAL_LABEL_PT[interval] ?? '' : ''} está próxima do
        vencimento.
      </Text>

      <div style={styles.card}>
        {periodEnd && (
          <p style={styles.cardRow}>
            <strong>Vence em:</strong>{' '}
            <span style={styles.cardValue}>{formatDateBR(periodEnd)}</span>
          </p>
        )}
        <p style={styles.cardRow}>
          <strong>Renovação:</strong>{' '}
          <span style={styles.cardValue}>Manual via PIX</span>
        </p>
      </div>

      <Text style={styles.p}>
        Como as assinaturas PIX são renovadas manualmente, gere um novo
        pagamento agora para continuar com todos os recursos Pro (links
        ilimitados, encurtador, sem anúncios).
      </Text>

      <Button href="https://forlink.app/assinar" style={styles.button}>
        Renovar minha assinatura
      </Button>

      <Text style={styles.p}>
        Se você não renovar, sua conta será convertida automaticamente
        para o plano Free na data de vencimento — seus links continuam
        salvos, mas alguns recursos serão limitados.
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: ({ daysLeft }: Props = {}) =>
    `Sua assinatura ForLink Pro vence em ${daysLeft ?? 3} dias`,
  displayName: 'Vencimento próximo',
  previewData: {
    displayName: 'Ana',
    interval: 'month',
    periodEnd: new Date(Date.now() + 3 * 86400_000).toISOString(),
    daysLeft: 3,
  },
} satisfies TemplateEntry
