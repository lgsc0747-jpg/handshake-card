/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface Props { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ siteName, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password</Preview>
    <Body style={brand.body}>
      <Container style={brand.container}>
        <div style={brand.brandRow}><span style={brand.brandMark}>{siteName}</span></div>
        <Heading style={brand.h1}>Reset your password</Heading>
        <Text style={brand.text}>
          We received a request to reset your password. Tap below to choose a new one — the link expires in 60 minutes.
        </Text>
        <div style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={brand.button} href={confirmationUrl}>Reset password</Button>
        </div>
        <Text style={brand.footer}>
          Didn't request this? Ignore this email — your password stays the same.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
