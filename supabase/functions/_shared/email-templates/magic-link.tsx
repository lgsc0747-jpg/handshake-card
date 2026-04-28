/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface Props { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} login link</Preview>
    <Body style={brand.body}>
      <Container style={brand.container}>
        <div style={brand.brandRow}><span style={brand.brandMark}>{siteName}</span></div>
        <Heading style={brand.h1}>One-tap sign in</Heading>
        <Text style={brand.text}>Tap the button to log in to your account. The link expires shortly.</Text>
        <div style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={brand.button} href={confirmationUrl}>Log in</Button>
        </div>
        <Text style={brand.footer}>If you didn't request this link, you can safely ignore it.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
