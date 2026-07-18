import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components'

// Brand tokens (mirror src/styles.css — deep blue "ForLink" identity)
export const brand = {
  primary: '#1e3a8a',
  primaryDark: '#172554',
  accent: '#2563eb',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  soft: '#f8fafc',
  bg: '#ffffff',
}

export const styles = {
  main: {
    backgroundColor: '#f1f5f9',
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '32px 12px',
    color: brand.text,
  } as React.CSSProperties,
  container: {
    backgroundColor: brand.bg,
    borderRadius: '14px',
    border: `1px solid ${brand.border}`,
    maxWidth: '560px',
    margin: '0 auto',
    overflow: 'hidden',
  } as React.CSSProperties,
  header: {
    backgroundColor: brand.primaryDark,
    padding: '22px 28px',
    color: '#ffffff',
  } as React.CSSProperties,
  wordmark: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: '#ffffff',
    margin: 0,
  } as React.CSSProperties,
  tagline: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#93c5fd',
    margin: '2px 0 0',
  } as React.CSSProperties,
  body: {
    padding: '28px 28px 8px',
  } as React.CSSProperties,
  h1: {
    fontSize: '22px',
    fontWeight: 700,
    color: brand.text,
    margin: '0 0 12px',
    lineHeight: 1.3,
  } as React.CSSProperties,
  p: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#334155',
    margin: '0 0 14px',
  } as React.CSSProperties,
  button: {
    display: 'inline-block',
    backgroundColor: brand.primary,
    color: '#ffffff',
    padding: '12px 22px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    margin: '10px 0 18px',
  } as React.CSSProperties,
  card: {
    backgroundColor: brand.soft,
    border: `1px solid ${brand.border}`,
    borderRadius: '10px',
    padding: '16px 18px',
    margin: '4px 0 18px',
  } as React.CSSProperties,
  cardRow: {
    fontSize: '13px',
    color: '#475569',
    margin: '4px 0',
  } as React.CSSProperties,
  cardValue: {
    color: brand.text,
    fontWeight: 600,
  } as React.CSSProperties,
  footer: {
    padding: '18px 28px 24px',
    borderTop: `1px solid ${brand.border}`,
    backgroundColor: brand.soft,
  } as React.CSSProperties,
  footerText: {
    fontSize: '12px',
    color: brand.muted,
    margin: '0 0 4px',
    lineHeight: 1.55,
  } as React.CSSProperties,
  link: {
    color: brand.accent,
    textDecoration: 'none',
  } as React.CSSProperties,
}

interface ShellProps {
  preview: string
  tagline?: string
  children: React.ReactNode
}

export function EmailShell({ preview, tagline, children }: ShellProps) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>ForLink</Text>
            {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
          </Section>

          <Section style={styles.body}>{children}</Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Você recebeu este e-mail porque tem uma conta em{' '}
              <Link href="https://forlink.app" style={styles.link}>
                forlink.app
              </Link>
              .
            </Text>
            <Text style={styles.footerText}>
              ForLink — Organize e compartilhe seus links favoritos.
            </Text>
            <Hr style={{ borderColor: brand.border, margin: '10px 0 6px' }} />
            <Text style={styles.footerText}>
              Dúvidas? Fale com a gente em{' '}
              <Link href="mailto:suporte@forlink.app" style={styles.link}>
                suporte@forlink.app
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatDateBR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export const INTERVAL_LABEL_PT: Record<string, string> = {
  month: 'Mensal',
  quarter: 'Trimestral',
  year: 'Anual',
}
