
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
  Section,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface BookingFailedEmailProps {
  error: string;
  retryAvailable: boolean;
}

export const BookingFailedEmail = ({ error, retryAvailable }: BookingFailedEmailProps) => (
  <Html>
    <Head />
    <Preview>Fel vid automatisk bokning</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Fel vid automatisk bokning</Heading>
        
        <Text style={text}>
          Vi stötte på ett problem när vi försökte boka din provtid automatiskt.
        </Text>

        <Text style={errorText}>
          <strong>Felmeddelande:</strong> {error}
        </Text>

        <Text style={text}>
          Detta kan bero på:
        </Text>
        
        <Text style={text}>
          • Tillfälliga problem hos Trafikverket<br/>
          • Inga tillgängliga tider som matchar dina kriterier<br/>
          • Systemunderhåll<br/>
          • Nätverksproblem
        </Text>

        {retryAvailable && (
          <>
            <Text style={text}>
              Ingen panik! Vi kommer automatiskt att försöka igen inom kort.
            </Text>

            <Section style={buttonContainer}>
              <Button
                style={button}
                href="https://snabbtkorprov.se/dashboard"
              >
                Kontrollera status
              </Button>
            </Section>
          </>
        )}

        <Text style={text}>
          Om problemet kvarstår, kontakta oss på support@snabbtkorprov.se så hjälper vi dig.
        </Text>

        <Text style={footer}>
          Med vänliga hälsningar,<br/>
          Teamet på Snabbtkörprov.se
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
};

const errorText = {
  color: '#dc2626',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '16px 40px',
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
};

const buttonContainer = {
  padding: '24px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '32px 0',
  padding: '0 40px',
};
