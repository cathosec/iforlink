import * as React from 'react'
import { Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, styles } from './_layout'

interface Props {
  displayName?: string
}

const Email = ({ displayName }: Props) => {
  const name = displayName || 'você'
  return (
    <EmailShell
      preview="Sua assinatura ForLink Pro venceu"
      tagline="Assinatura vencida"
    >
      <Text style={styles.h1}>Sua assinatura Pro venceu</Text>
      <Text style={styles.p}>
        Olá, {name}. Sua assinatura <strong>ForLink Pro</strong> chegou
        ao fim e sua conta foi convertida para o plano Free.
      </Text>

      <Text style={styles.p}>
        <strong>Nada foi perdido:</strong> todos os seus links,
        categorias e estatísticas continuam salvos e seu perfil público
        segue no ar normalmente.
      </Text>

      <Text style={styles.p}>
        Alguns recursos ficam limitados no Free — como o encurtador
        forlink.app/s/…, o limite de 15 links e a exibição de anúncios.
        Renove agora para reativar tudo em segundos.
      </Text>

      <Button href="https://forlink.app/assinar" style={styles.button}>
        Reativar meu Pro
      </Button>

      <Text style={styles.p}>
        Obrigado por ter sido Pro — esperamos ver você de volta em breve!
      </Text>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: 'Sua assinatura ForLink Pro venceu',
  displayName: 'Vencimento (venceu)',
  previewData: { displayName: 'Ana' },
} satisfies TemplateEntry
