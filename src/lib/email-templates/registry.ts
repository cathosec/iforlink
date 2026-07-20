import type { ComponentType } from 'react'

import { template as welcomeTemplate } from './welcome'
import { template as emailConfirmationTemplate } from './email-confirmation'
import { template as paymentConfirmedTemplate } from './payment-confirmed'
import { template as proActivatedTemplate } from './pro-activated'
import { template as adminNewSignupTemplate } from './admin-new-signup'
import { template as adminNewSubscriberTemplate } from './admin-new-subscriber'
import { template as subscriptionExpiringTemplate } from './subscription-expiring'
import { template as subscriptionExpiredTemplate } from './subscription-expired'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
  'email-confirmation': emailConfirmationTemplate,
  'payment-confirmed': paymentConfirmedTemplate,
  'pro-activated': proActivatedTemplate,
  'admin-new-signup': adminNewSignupTemplate,
  'admin-new-subscriber': adminNewSubscriberTemplate,
  'subscription-expiring': subscriptionExpiringTemplate,
  'subscription-expired': subscriptionExpiredTemplate,
}
