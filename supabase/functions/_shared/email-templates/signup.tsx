/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface Props { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to activate your {siteName} identity</Preview>
    <Body style={brand.body}>
      <Container style={brand.container}>
        <div style={brand.brandRow}><span style={brand.brandMark}>{siteName}</span></div>
        <Heading style={brand.h1}>Welcome — let's verify it's you</Heading>
        <Text style={brand.text}>
          Tap the button below to confirm <Link href={`mailto:${recipient}`} style={brand.link}>{recipient}</Link> and activate your digital identity.
        </Text>
        <div style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={brand.button} href={confirmationUrl}>Verify email</Button>
        </div>
        <Text style={brand.footer}>
          If you didn't create a {siteName} account, you can safely ignore this email — no account will be created.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
