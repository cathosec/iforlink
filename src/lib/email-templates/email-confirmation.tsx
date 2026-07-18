import * as React from 'react'
import { Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles } from './_layout'

interface Props {
  confirmationUrl?: string
  displayName?: string
}

const Email = ({ confirmationUrl, displayName }: Props) => {
  const url = confirmationUrl || 'https://forlink.app/auth'
  return (
    <EmailShell
      preview="Confirme seu e-mail para ativar sua conta ForLink"
      tagline="Confirmação de e-mail"
    >
      <Text style={styles.h1}>
        {displayName ? `Olá, ${displayName}!` : 'Olá!'} Confirme seu e-mail
      </Text>
      <Text style={styles.p}>
        Para ativar sua conta no ForLink e começar a publicar seus links,
        confirme seu endereço de e-mail clicando no botão abaixo. Este link
        é válido por 24 horas.
      </Text>
      <Button href={url} style={styles.button}>
        Confirmar meu e-mail
      </Button>
      <Text style={styles.p}>
        Se o botão não funcionar, copie e cole este endereço no navegador:
      </Text>
      <Text
        style={{
          ...styles.p,
          wordBreak: 'break-all',
          fontSize: '12px',
          color: '#475569',
        }}
      >
        {url}
      </Text>
      <Text style={styles.p}>
        Não foi você que criou uma conta? Pode ignorar este e-mail com
        segurança — nada acontece sem essa confirmação.
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: 'Confirme seu e-mail no ForLink',
  displayName: 'Confirmação de e-mail',
  previewData: {
    confirmationUrl: 'https://forlink.app/auth?token=exemplo',
    displayName: 'Ana',
  },
} satisfies TemplateEntry
