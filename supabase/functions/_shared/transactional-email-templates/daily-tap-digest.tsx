/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { brand } from '../email-templates/_brand.ts'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'handshake-card'

interface PersonaBreakdown {
  label: string
  taps: number
}

interface Props {
  ownerName?: string
  dateLabel?: string
  totalTaps?: number
  totalLeads?: number
  uniqueVisitors?: number
  topPersonas?: PersonaBreakdown[]
  dashboardUrl?: string
}

const kpiRow = { display: 'flex', gap: '12px', margin: '8px 0 24px' }
const kpiBox = { flex: 1, backgroundColor: 'rgba(13, 148, 136, 0.08)', borderRadius: '12px', padding: '16px 12px', textAlign: 'center' as const }
const kpiNum = { fontSize: '28px', fontWeight: 700 as const, color: '#5eead4', margin: '0 0 4px', lineHeight: 1 }
const kpiLabel = { fontSize: '11px', color: '#94a3b8', margin: 0, fontWeight: 600 as const, letterSpacing: '0.06em', textTransform: 'uppercase' as const }
const personaRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }
const personaName = { fontSize: '14px', color: '#f1f5f9', margin: 0, fontWeight: 500 as const }
const personaCount = { fontSize: '14px', color: '#5eead4', margin: 0, fontWeight: 600 as const }

const DailyTapDigestEmail = ({ ownerName, dateLabel, totalTaps = 0, totalLeads = 0, uniqueVisitors = 0, topPersonas = [], dashboardUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{totalTaps} tap{totalTaps === 1 ? '' : 's'} yesterday on your {SITE_NAME} profile</Preview>
    <Body style={brand.body}>
      <Container style={brand.container}>
        <div style={brand.brandRow}><span style={brand.brandMark}>{SITE_NAME} · daily digest</span></div>
        <Heading style={brand.h1}>{ownerName ? `Morning, ${ownerName} ☕` : 'Your daily digest ☕'}</Heading>
        <Text style={brand.text}>
          Here's how your network performed{dateLabel ? ` on ${dateLabel}` : ' yesterday'}.
        </Text>

        <div style={kpiRow}>
          <div style={kpiBox}><p style={kpiNum}>{totalTaps}</p><p style={kpiLabel}>Taps</p></div>
          <div style={kpiBox}><p style={kpiNum}>{uniqueVisitors}</p><p style={kpiLabel}>Visitors</p></div>
          <div style={kpiBox}><p style={kpiNum}>{totalLeads}</p><p style={kpiLabel}>Leads</p></div>
        </div>

        {topPersonas.length > 0 && (
          <Section>
            <Text style={{ ...brand.text, fontWeight: 600, color: '#f1f5f9', margin: '12px 0 4px' }}>Top personas</Text>
            {topPersonas.slice(0, 5).map((p, i) => (
              <div key={i} style={personaRow}>
                <p style={personaName}>{p.label}</p>
                <p style={personaCount}>{p.taps} tap{p.taps === 1 ? '' : 's'}</p>
              </div>
            ))}
          </Section>
        )}

        {dashboardUrl && (
          <div style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button style={brand.button} href={dashboardUrl}>View full analytics</Button>
          </div>
        )}

        <Hr style={brand.divider} />
        <Text style={brand.footer}>
          Sent because tap digests are on. Turn this off anytime in Settings → Notifications.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailyTapDigestEmail,
  subject: (data: Record<string, any>) => `${data.totalTaps ?? 0} tap${(data.totalTaps ?? 0) === 1 ? '' : 's'} on your handshake-card yesterday`,
  displayName: 'Daily tap digest',
  previewData: {
    ownerName: 'Alex',
    dateLabel: 'Mon, Apr 27',
    totalTaps: 14,
    totalLeads: 3,
    uniqueVisitors: 9,
    topPersonas: [
      { label: 'Networking', taps: 8 },
      { label: 'Personal', taps: 4 },
      { label: 'Studio', taps: 2 },
    ],
    dashboardUrl: 'https://handshake-card.lovable.app/',
  },
} satisfies TemplateEntry
