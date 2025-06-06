
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PaymentConfirmationEmailProps {
  amount: number;
  currency: string;
  subscriptionPeriod: string;
}

export const PaymentConfirmationEmail = ({ amount, currency, subscriptionPeriod }: PaymentConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Betalning bekräftad - Din prenumeration är aktiv</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Betalning bekräftad! ✅</Heading>
        
        <Text style={text}>
          Tack för din betalning! Din prenumeration på Snabbtkörprov.se är nu aktiv.
        </Text>

        <Section style={detailsContainer}>
          <Heading style={h2}>Betalningsdetaljer</Heading>
          <Text style={detail}><strong>Belopp:</strong> {amount} {currency.toUpperCase()}</Text>
          <Text style={detail}><strong>Prenumerationsperiod:</strong> {subscriptionPeriod}</Text>
          <Text style={detail}><strong>Status:</strong> Aktiv</Text>
        </Section>

        <Text style={text}>
          Nu kan du börja använda alla funktioner:
        </Text>
        
        <Text style={text}>
          • Automatisk bokning av provtider<br/>
          • Realtidsövervakning av tillgängliga tider<br/>
          • Email-notifikationer<br/>
          • Obegränsat antal bokningsförsök
        </Text>

        <Section style={buttonContainer}>
          <Button
            style={button}
            href="https://snabbtkorprov.se/dashboard"
          >
            Gå till instrumentpanelen
          </Button>
        </Section>

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

const h2 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '24px 0 16px 0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
};

const detailsContainer = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '24px',
};

const detail = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
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
