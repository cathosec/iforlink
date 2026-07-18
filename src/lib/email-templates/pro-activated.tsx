import * as React from 'react'
import { Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles, formatDateBR, INTERVAL_LABEL_PT } from './_layout'

interface Props {
  displayName?: string
  interval?: string
  periodEnd?: string
}

const Email = ({ displayName, interval, periodEnd }: Props) => {
  const name = displayName || 'você'
  return (
    <EmailShell
      preview="ForLink Pro ativado na sua conta"
      tagline="Assinatura Pro ativa"
    >
      <Text style={styles.h1}>ForLink Pro ativado 🚀</Text>
      <Text style={styles.p}>
        Prontinho, {name}! Sua assinatura <strong>ForLink Pro</strong> já
        está ativa e todos os recursos premium estão liberados na sua
        conta.
      </Text>

      <div style={styles.card}>
        <p style={styles.cardRow}>
          <strong>Plano:</strong>{' '}
          <span style={styles.cardValue}>
            ForLink Pro {interval ? INTERVAL_LABEL_PT[interval] ?? '' : ''}
          </span>
        </p>
        {periodEnd && (
          <p style={styles.cardRow}>
            <strong>Válido até:</strong>{' '}
            <span style={styles.cardValue}>{formatDateBR(periodEnd)}</span>
          </p>
        )}
        <p style={styles.cardRow}>
          <strong>Status:</strong>{' '}
          <span style={{ ...styles.cardValue, color: '#15803d' }}>Ativo</span>
        </p>
      </div>

      <Text style={styles.p}>
        <strong>O que você desbloqueou:</strong>
      </Text>
      <ul style={{ ...styles.p, paddingLeft: '20px', margin: '0 0 16px' }}>
        <li>Links e categorias ilimitados</li>
        <li>Encurtador próprio em forlink.app/s/…</li>
        <li>Experiência 100% sem anúncios</li>
        <li>Estatísticas detalhadas de cliques e visitas</li>
        <li>Prioridade no suporte</li>
      </ul>

      <Button href="https://forlink.app/dashboard" style={styles.button}>
        Explorar recursos Pro
      </Button>

      <Text style={styles.p}>
        Obrigado por fazer parte do ForLink — seu apoio mantém a
        plataforma viva e melhorando todo mês.
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: 'ForLink Pro ativado na sua conta',
  displayName: 'Pro ativado',
  previewData: {
    displayName: 'Ana',
    interval: 'month',
    periodEnd: new Date(Date.now() + 30 * 86400_000).toISOString(),
  },
} satisfies TemplateEntry
