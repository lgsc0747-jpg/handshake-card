/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { brand } from '../email-templates/_brand.ts'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'handshake-card'

interface Props {
  ownerName?: string
  personaLabel?: string
  visitorName?: string
  visitorEmail?: string
  visitorPhone?: string
  visitorCompany?: string
  visitorMessage?: string
  dashboardUrl?: string
}

const labelStyle = { fontSize: '11px', color: '#64748b', fontWeight: 600 as const, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '0 0 4px' }
const valueStyle = { fontSize: '15px', color: '#f1f5f9', margin: '0 0 16px' }
const messageBox = { backgroundColor: 'rgba(13, 148, 136, 0.08)', borderLeft: '3px solid #0d9488', borderRadius: '8px', padding: '14px 16px', margin: '12px 0 20px', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, fontStyle: 'italic' as const }

const NewLeadEmail = ({ ownerName, personaLabel, visitorName, visitorEmail, visitorPhone, visitorCompany, visitorMessage, dashboardUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New lead{visitorName ? ` from ${visitorName}` : ''} on {personaLabel ?? SITE_NAME}</Preview>
    <Body style={brand.body}>
      <Container style={brand.container}>
        <div style={brand.brandRow}><span style={brand.brandMark}>{SITE_NAME}</span></div>
        <Heading style={brand.h1}>{ownerName ? `Hey ${ownerName} —` : 'Heads up —'} new lead 👋</Heading>
        <Text style={brand.text}>
          Someone just exchanged contact info on your <strong style={{ color: '#5eead4' }}>{personaLabel ?? 'profile'}</strong> persona.
        </Text>

        <Section>
          {visitorName && (<><Text style={labelStyle}>Name</Text><Text style={valueStyle}>{visitorName}</Text></>)}
          {visitorEmail && (<><Text style={labelStyle}>Email</Text><Text style={valueStyle}>{visitorEmail}</Text></>)}
          {visitorPhone && (<><Text style={labelStyle}>Phone</Text><Text style={valueStyle}>{visitorPhone}</Text></>)}
          {visitorCompany && (<><Text style={labelStyle}>Company</Text><Text style={valueStyle}>{visitorCompany}</Text></>)}
          {visitorMessage && (<><Text style={labelStyle}>Message</Text><Text style={messageBox}>"{visitorMessage}"</Text></>)}
        </Section>

        {dashboardUrl && (
          <div style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button style={brand.button} href={dashboardUrl}>Open in CRM</Button>
          </div>
        )}

        <Hr style={brand.divider} />
        <Text style={brand.footer}>
          You're getting this because lead notifications are on. Manage them anytime in Settings → Notifications.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewLeadEmail,
  subject: (data: Record<string, any>) => `New lead${data.visitorName ? ` from ${data.visitorName}` : ''} on ${data.personaLabel ?? 'your profile'}`,
  displayName: 'New lead notification',
  previewData: {
    ownerName: 'Alex',
    personaLabel: 'Networking',
    visitorName: 'Jamie Cruz',
    visitorEmail: 'jamie@example.com',
    visitorPhone: '+63 917 555 0102',
    visitorCompany: 'Acme Studios',
    visitorMessage: 'Loved your card at the meetup — would love to chat about a collab.',
    dashboardUrl: 'https://handshake-card.lovable.app/leads',
  },
} satisfies TemplateEntry
