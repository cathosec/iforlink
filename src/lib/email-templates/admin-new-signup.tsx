import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles } from './_layout'

interface Props {
  email: string
  displayName?: string
  username?: string
  createdAt?: string
}

const Email = ({ email, displayName, username, createdAt }: Props) => {
  const when = createdAt ? new Date(createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')
  return (
    <EmailShell preview={`Novo cadastro: ${email}`} tagline="Admin · Novo cadastro">
      <Text style={styles.h1}>Novo usuário no ForLink 🎉</Text>
      <Text style={styles.p}>
        Uma nova conta acabou de ser criada na plataforma:
      </Text>
      <div style={styles.card}>
        <Text style={styles.cardRow}>
          E-mail: <span style={styles.cardValue}>{email}</span>
        </Text>
        {displayName ? (
          <Text style={styles.cardRow}>
            Nome: <span style={styles.cardValue}>{displayName}</span>
          </Text>
        ) : null}
        {username ? (
          <Text style={styles.cardRow}>
            Usuário: <span style={styles.cardValue}>forlink.app/{username}</span>
          </Text>
        ) : null}
        <Text style={styles.cardRow}>
          Criado em: <span style={styles.cardValue}>{when}</span>
        </Text>
      </div>
      <Text style={styles.p}>
        Aviso automático enviado a partir do painel administrativo.
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => `Novo cadastro no ForLink · ${d.email ?? ''}`,
  displayName: 'Admin · Novo cadastro',
  previewData: { email: 'ana@example.com', displayName: 'Ana', username: 'ana' },
} satisfies TemplateEntry
