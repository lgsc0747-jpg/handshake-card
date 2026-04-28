/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface Props { token: string }

export const ReauthenticationEmail = ({ token }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={brand.body}>
      <Container style={brand.container}>
        <div style={brand.brandRow}><span style={brand.brandMark}>handshake-card</span></div>
        <Heading style={brand.h1}>Verify it's you</Heading>
        <Text style={brand.text}>Enter this code to confirm your identity:</Text>
        <div style={{ textAlign: 'center' }}><span style={brand.code}>{token}</span></div>
        <Text style={brand.footer}>This code expires shortly. If you didn't request it, ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
