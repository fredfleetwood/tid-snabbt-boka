
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface BookingStartedEmailProps {
  configDetails: {
    examType: string;
    locations: string[];
  };
}

export const BookingStartedEmail = ({ configDetails }: BookingStartedEmailProps) => (
  <Html>
    <Head />
    <Preview>Automatisk bokning startad</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚀 Automatisk bokning startad!</Heading>
        
        <Text style={text}>
          Din automatiska bokning har startats och söker nu aktivt efter tillgängliga provtider.
        </Text>

        <Text style={text}>
          <strong>Söker efter:</strong><br/>
          Provtyp: {configDetails.examType}<br/>
          Platser: {configDetails.locations.join(', ')}
        </Text>

        <Text style={text}>
          Vi övervakar kontinuerligt Trafikverkets bokningssystem och kommer att boka första tillgängliga tid som matchar dina kriterier.
        </Text>

        <Text style={text}>
          Du kommer att få ett email så fort en bokning är gjord. Du kan också följa statusen i realtid på din instrumentpanel.
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

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '32px 0',
  padding: '0 40px',
};
