import * as React from 'react'
import { Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles } from './_layout'

interface Props {
  displayName?: string
  username?: string
}

const Email = ({ displayName, username }: Props) => {
  const name = displayName || 'por aí'
  const profileUrl = username
    ? `https://forlink.app/${username}`
    : 'https://forlink.app/dashboard'
  return (
    <EmailShell
      preview="Sua conta ForLink está pronta"
      tagline="Sua conta está pronta"
    >
      <Text style={styles.h1}>Bem-vindo(a) ao ForLink, {name} 👋</Text>
      <Text style={styles.p}>
        Sua conta foi criada com sucesso. A partir de agora você pode
        organizar todos os seus links importantes em um único perfil
        público, com categorias, estatísticas de cliques e domínio próprio
        <strong> forlink.app/seuusuario</strong>.
      </Text>
      <Text style={styles.p}>
        Comece adicionando seus primeiros links no painel:
      </Text>
      <Button href="https://forlink.app/dashboard" style={styles.button}>
        Abrir meu painel
      </Button>
      <Text style={styles.p}>
        Seu perfil público estará disponível em:{' '}
        <a href={profileUrl} style={styles.link}>
          {profileUrl}
        </a>
      </Text>
      <Text style={styles.p}>
        No plano <strong>Free</strong> você já tem até 15 links e 3
        categorias. Precisa de mais? Faça upgrade para o{' '}
        <a href="https://forlink.app/assinar" style={styles.link}>
          ForLink Pro
        </a>{' '}
        e desbloqueie links ilimitados, encurtador próprio e uma
        experiência sem anúncios.
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: 'Bem-vindo(a) ao ForLink',
  displayName: 'Boas-vindas (nova conta)',
  previewData: { displayName: 'Ana', username: 'ana' },
} satisfies TemplateEntry
