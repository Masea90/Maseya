/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const PROFILE_URL = 'https://maseya.es/profile'
const SCAN_URL = 'https://maseya.es/scan'

const WelcomeEmail = () => (
  <Html lang="es" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Ya tienes tu cuenta en Maseya: tres cosas para empezar</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Ya tienes tu cuenta en Maseya</Heading>
        <Text style={text}>
          Maseya lee la etiqueta por ti y te dice si un producto es para ti:
          comida y cosmética, con su fuente.
        </Text>
        <Text style={text}>
          <strong>Tres cosas para empezar:</strong>
        </Text>

        <Text style={stepTitle}>1. Completa tu perfil</Text>
        <Text style={text}>
          Alergias, intolerancias, dieta, embarazo o tipo de piel. Así verás tu
          nota personal, no una nota para todos.
        </Text>
        <Button className="dm-btn" style={button} href={PROFILE_URL}>
          Completar mi perfil
        </Button>

        <Text style={stepTitle}>2. Escanea tu primer producto</Text>
        <Text style={text}>
          Apunta al código de barras de lo que tengas en casa.{' '}
          <Link href={SCAN_URL} style={link}>
            Escanear ahora
          </Link>
        </Text>

        <Text style={stepTitle}>3. Tenla a mano en tu pantalla de inicio</Text>
        <Text style={text}>
          iPhone: abre maseya.es en Safari, pulsa Compartir y luego «Añadir a
          pantalla de inicio». Android: abre maseya.es en Chrome, menú ⋮ y
          «Añadir a pantalla de inicio» o «Instalar aplicación». No hace falta
          descargar nada de ninguna tienda.
        </Text>

        <Text style={text}>
          ¿Algo no cuadra en un producto? Dínoslo desde la propia app, en la
          ficha del producto. Lo revisamos.
        </Text>

        <Text style={footer}>
          Recibes este email porque has creado una cuenta en maseya.es.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Te damos la bienvenida a Maseya 🌿',
  displayName: 'Bienvenida',
  previewData: {},
} satisfies TemplateEntry

import type { TemplateEntry } from './registry.ts'

export default WelcomeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1B1B1B',
  margin: '0 0 20px',
}
const stepTitle = {
  fontSize: '15px',
  fontWeight: 'bold' as const,
  color: '#1B1B1B',
  margin: '25px 0 8px',
}
const text = {
  fontSize: '14px',
  color: '#5E6762',
  lineHeight: '1.5',
  margin: '0 0 15px',
}
const link = { color: '#2D6C4F', textDecoration: 'underline' }
const button = {
  backgroundColor: '#2D6C4F',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #2D6C4F',
  borderRadius: '16px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
