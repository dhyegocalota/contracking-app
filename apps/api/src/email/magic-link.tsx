import { Body, Button, Container, Head, Html, Preview, Section, Text } from '@react-email/components';

const BACKGROUND_COLOR = '#09090f';
const ACCENT_COLOR = '#d94d73';
const TEXT_COLOR = '#ffffff';
const FOOTER_COLOR = '#888888';
const OTP_BACKGROUND = '#1a1a2e';

export function MagicLinkEmail({ verifyUrl, otp }: { verifyUrl: string; otp: string }) {
  return (
    <Html>
      <Head />
      <Preview>Seu link de acesso ao Contracking</Preview>
      <Body style={{ backgroundColor: BACKGROUND_COLOR, fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 20px' }}>
          <Section>
            <Text style={{ color: ACCENT_COLOR, fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
              Contracking
            </Text>
            <Text style={{ color: TEXT_COLOR, fontSize: '16px', lineHeight: '1.5', marginBottom: '8px' }}>
              Use o código abaixo ou clique no botão para acessar.
            </Text>
            <Text style={{ color: FOOTER_COLOR, fontSize: '14px', marginBottom: '24px' }}>
              Este código expira em 15 minutos.
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: '32px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                letterSpacing: '12px',
                background: OTP_BACKGROUND,
                color: TEXT_COLOR,
                padding: '16px 24px',
                borderRadius: '8px',
                marginBottom: '32px',
              }}
            >
              {otp}
            </Text>
            <Button
              href={verifyUrl}
              style={{
                backgroundColor: ACCENT_COLOR,
                color: TEXT_COLOR,
                padding: '12px 24px',
                borderRadius: '6px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Acessar Contracking
            </Button>
            <Text style={{ color: FOOTER_COLOR, fontSize: '14px', marginTop: '32px' }}>
              Se você não solicitou este link, ignore este email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
