
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface BookingSuccessEmailProps {
  bookingDetails: {
    examType: string;
    location: string;
    date: string;
    time: string;
    bookingReference?: string;
  };
}

export const BookingSuccessEmail = ({ bookingDetails }: BookingSuccessEmailProps) => (
  <Html>
    <Head />
    <Preview>🎉 Ditt körprov är bokat!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Grattis! Ditt körprov är bokat!</Heading>
        
        <Text style={text}>
          Fantastiska nyheter! Vi har framgångsrikt bokat en provtid åt dig.
        </Text>

        <Section style={detailsContainer}>
          <Heading style={h2}>Bokningsdetaljer</Heading>
          <Text style={detail}><strong>Provtyp:</strong> {bookingDetails.examType}</Text>
          <Text style={detail}><strong>Plats:</strong> {bookingDetails.location}</Text>
          <Text style={detail}><strong>Datum:</strong> {bookingDetails.date}</Text>
          <Text style={detail}><strong>Tid:</strong> {bookingDetails.time}</Text>
          {bookingDetails.bookingReference && (
            <Text style={detail}><strong>Bokningsreferens:</strong> {bookingDetails.bookingReference}</Text>
          )}
        </Section>

        <Text style={text}>
          <strong>Viktigt att komma ihåg:</strong>
        </Text>
        
        <Text style={text}>
          • Ta med giltig legitimation<br/>
          • Kom i god tid (minst 15 minuter före)<br/>
          • Kontrollera Trafikverkets webbplats för eventuella ändringar<br/>
          • Ha ditt körkortstillstånd med dig
        </Text>

        <Text style={text}>
          Du kan logga in på Trafikverkets webbplats för att se alla detaljer om din bokning.
        </Text>

        <Text style={footer}>
          Lycka till med ditt körprov!<br/>
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
  padding: '0 40px',
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

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '32px 0',
  padding: '0 40px',
};
