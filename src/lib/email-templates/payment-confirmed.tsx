import * as React from 'react'
import { Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles, formatBRL, formatDateBR, INTERVAL_LABEL_PT } from './_layout'

interface Props {
  displayName?: string
  amountCents?: number
  interval?: string
  paidAt?: string
  paymentId?: string
}

const Email = ({ displayName, amountCents, interval, paidAt, paymentId }: Props) => {
  const name = displayName || 'você'
  return (
    <EmailShell
      preview="Recebemos seu pagamento PIX — obrigado!"
      tagline="Pagamento confirmado"
    >
      <Text style={styles.h1}>Pagamento recebido, {name} ✅</Text>
      <Text style={styles.p}>
        Confirmamos o recebimento do seu pagamento PIX referente à
        assinatura ForLink Pro. Obrigado por apoiar o projeto!
      </Text>

      <div style={styles.card}>
        <p style={styles.cardRow}>
          <strong>Plano:</strong>{' '}
          <span style={styles.cardValue}>
            ForLink Pro {interval ? INTERVAL_LABEL_PT[interval] ?? '' : ''}
          </span>
        </p>
        {typeof amountCents === 'number' && (
          <p style={styles.cardRow}>
            <strong>Valor:</strong>{' '}
            <span style={styles.cardValue}>{formatBRL(amountCents)}</span>
          </p>
        )}
        {paidAt && (
          <p style={styles.cardRow}>
            <strong>Pago em:</strong>{' '}
            <span style={styles.cardValue}>{formatDateBR(paidAt)}</span>
          </p>
        )}
        {paymentId && (
          <p style={styles.cardRow}>
            <strong>ID do pagamento:</strong>{' '}
            <span style={styles.cardValue}>{paymentId}</span>
          </p>
        )}
        <p style={styles.cardRow}>
          <strong>Método:</strong>{' '}
          <span style={styles.cardValue}>PIX (Mercado Pago)</span>
        </p>
      </div>

      <Text style={styles.p}>
        Você receberá em instantes um segundo e-mail com a confirmação da
        ativação do <strong>ForLink Pro</strong> na sua conta.
      </Text>

      <Button href="https://forlink.app/dashboard" style={styles.button}>
        Ir para meu painel
      </Button>

      <Text style={{ ...styles.p, fontSize: '12px', color: '#64748b' }}>
        Este e-mail serve como recibo do seu pagamento. Guarde-o para seus
        registros.
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: 'Pagamento confirmado — ForLink Pro',
  displayName: 'Pagamento PIX confirmado',
  previewData: {
    displayName: 'Ana',
    amountCents: 1990,
    interval: 'month',
    paidAt: new Date().toISOString(),
    paymentId: 'MP-123456789',
  },
} satisfies TemplateEntry
