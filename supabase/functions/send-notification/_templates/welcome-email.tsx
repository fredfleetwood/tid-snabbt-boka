
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface WelcomeEmailProps {
  userEmail: string;
}

export const WelcomeEmail = ({ userEmail }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Välkommen till Snabbtkörprov.se - Din automatiska bokningsassistent</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Välkommen till Snabbtkörprov.se! 🚗</Heading>
        
        <Text style={text}>
          Hej och välkommen till Snabbtkörprov.se! Vi är glada att ha dig som användare.
        </Text>

        <Text style={text}>
          Med vår tjänst kan du automatiskt boka provtider för körkortsprov så fort de blir tillgängliga. 
          Ingen mer väntan eller konstant uppdatering av Trafikverkets webbplats!
        </Text>

        <Section style={buttonContainer}>
          <Button
            style={button}
            href="https://snabbtkorprov.se/dashboard"
          >
            Kom igång nu
          </Button>
        </Section>

        <Text style={text}>
          <strong>Nästa steg:</strong>
        </Text>
        
        <Text style={text}>
          1. Logga in på din instrumentpanel<br/>
          2. Aktivera din prenumeration (300kr/månad)<br/>
          3. Konfigurera dina bokningsinställningar<br/>
          4. Starta automatisk bokning
        </Text>

        <Text style={text}>
          Vi finns här för att hjälpa dig. Kontakta oss på support@snabbtkorprov.se om du har några frågor.
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
