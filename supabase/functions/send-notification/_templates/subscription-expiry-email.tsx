
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

interface SubscriptionExpiryEmailProps {
  daysLeft: number;
  renewalUrl: string;
}

export const SubscriptionExpiryEmail = ({ daysLeft, renewalUrl }: SubscriptionExpiryEmailProps) => (
  <Html>
    <Head />
    <Preview>Din prenumeration går snart ut</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⏰ Din prenumeration går snart ut</Heading>
        
        <Text style={text}>
          Din prenumeration på Snabbtkörprov.se går ut om {daysLeft} {daysLeft === 1 ? 'dag' : 'dagar'}.
        </Text>

        <Text style={warningText}>
          Efter att prenumerationen går ut kommer du inte längre att kunna:
        </Text>
        
        <Text style={text}>
          • Starta nya automatiska bokningar<br/>
          • Få email-notifikationer<br/>
          • Använda våra premium-funktioner
        </Text>

        <Text style={text}>
          Förnya din prenumeration nu för att fortsätta använda alla funktioner utan avbrott.
        </Text>

        <Section style={buttonContainer}>
          <Button
            style={button}
            href={renewalUrl}
          >
            Förnya prenumeration
          </Button>
        </Section>

        <Text style={text}>
          Har du frågor? Kontakta oss på support@snabbtkorprov.se
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

const warningText = {
  color: '#dc2626',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
  fontWeight: 'bold',
};

const buttonContainer = {
  padding: '24px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#dc2626',
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
