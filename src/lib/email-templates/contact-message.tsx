import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles } from './_layout'

interface Props {
  name: string
  email: string
  subject: string
  message: string
  sentAt?: string
}

const Email = ({ name, email, subject, message, sentAt }: Props) => {
  const when = sentAt ? new Date(sentAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')
  return (
    <EmailShell preview={`Mensagem de ${name} · ${subject}`} tagline="Contato · Site ForLink">
      <Text style={styles.h1}>Nova mensagem do formulário de contato</Text>
      <div style={styles.card}>
        <Text style={styles.cardRow}>
          Nome: <span style={styles.cardValue}>{name}</span>
        </Text>
        <Text style={styles.cardRow}>
          E-mail: <span style={styles.cardValue}>{email}</span>
        </Text>
        <Text style={styles.cardRow}>
          Assunto: <span style={styles.cardValue}>{subject}</span>
        </Text>
        <Text style={styles.cardRow}>
          Enviado em: <span style={styles.cardValue}>{when}</span>
        </Text>
      </div>
      <Text style={styles.p}>Mensagem:</Text>
      <div style={styles.card}>
        <Text style={{ ...styles.p, whiteSpace: 'pre-wrap' as const, margin: 0 }}>{message}</Text>
      </div>
      <Text style={styles.p}>
        Responda diretamente a este e-mail para falar com {name}.
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => `Contato ForLink · ${d.subject ?? 'Nova mensagem'}`,
  displayName: 'Contato · Formulário do site',
  to: 'guthierresc@hotmail.com',
  previewData: {
    name: 'Ana Souza',
    email: 'ana@example.com',
    subject: 'Dúvida sobre o plano Pro',
    message: 'Olá, gostaria de saber mais sobre os recursos do plano Pro.',
  },
} satisfies TemplateEntry
