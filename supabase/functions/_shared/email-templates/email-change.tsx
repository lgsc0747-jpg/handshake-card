/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface Props { siteName: string; email: string; newEmail: string; confirmationUrl: string }

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your {siteName} email change</Preview>
    <Body style={brand.body}>
      <Container style={brand.container}>
        <div style={brand.brandRow}><span style={brand.brandMark}>{siteName}</span></div>
        <Heading style={brand.h1}>Confirm email change</Heading>
        <Text style={brand.text}>
          You requested to move your account from <Link href={`mailto:${email}`} style={brand.link}>{email}</Link> to <Link href={`mailto:${newEmail}`} style={brand.link}>{newEmail}</Link>.
        </Text>
        <div style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={brand.button} href={confirmationUrl}>Confirm change</Button>
        </div>
        <Text style={brand.footer}>If you didn't request this, please secure your account immediately.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
