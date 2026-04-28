/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface Props { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to {siteName}</Preview>
    <Body style={brand.body}>
      <Container style={brand.container}>
        <div style={brand.brandRow}><span style={brand.brandMark}>{siteName}</span></div>
        <Heading style={brand.h1}>You're invited</Heading>
        <Text style={brand.text}>
          You've been invited to join <Link href={siteUrl} style={brand.link}>{siteName}</Link>. Tap below to accept and create your account.
        </Text>
        <div style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={brand.button} href={confirmationUrl}>Accept invite</Button>
        </div>
        <Text style={brand.footer}>If this wasn't expected, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
