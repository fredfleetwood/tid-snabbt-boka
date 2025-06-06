
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { WelcomeEmail } from './_templates/welcome-email.tsx';
import { PaymentConfirmationEmail } from './_templates/payment-confirmation-email.tsx';
import { BookingStartedEmail } from './_templates/booking-started-email.tsx';
import { BookingSuccessEmail } from './_templates/booking-success-email.tsx';
import { BookingFailedEmail } from './_templates/booking-failed-email.tsx';
import { SubscriptionExpiryEmail } from './_templates/subscription-expiry-email.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'welcome' | 'payment_confirmation' | 'booking_started' | 'booking_success' | 'booking_failed' | 'subscription_expiry';
  email: string;
  data: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { type, email, data }: NotificationRequest = await req.json();

    // Check user notification preferences
    const { data: preferences } = await supabaseClient
      .from('user_preferences')
      .select('email_notifications')
      .eq('user_id', user.id)
      .single();

    if (preferences && !preferences.email_notifications && type !== 'welcome') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email notifications disabled' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let html = '';
    let subject = '';

    switch (type) {
      case 'welcome':
        html = await renderAsync(WelcomeEmail({ userEmail: email }));
        subject = 'Välkommen till Snabbtkörprov.se!';
        break;
      case 'payment_confirmation':
        html = await renderAsync(PaymentConfirmationEmail(data));
        subject = 'Betalning bekräftad - Din prenumeration är aktiv';
        break;
      case 'booking_started':
        html = await renderAsync(BookingStartedEmail(data));
        subject = 'Automatisk bokning startad';
        break;
      case 'booking_success':
        html = await renderAsync(BookingSuccessEmail(data));
        subject = '🎉 Körprov bokat framgångsrikt!';
        break;
      case 'booking_failed':
        html = await renderAsync(BookingFailedEmail(data));
        subject = 'Fel vid automatisk bokning';
        break;
      case 'subscription_expiry':
        html = await renderAsync(SubscriptionExpiryEmail(data));
        subject = data.daysLeft > 1 ? 'Din prenumeration går snart ut' : 'Din prenumeration går ut imorgon';
        break;
      default:
        throw new Error('Invalid notification type');
    }

    const emailResponse = await resend.emails.send({
      from: "Snabbtkörprov.se <noreply@snabbtkorprov.se>",
      to: [email],
      subject,
      html,
    });

    console.log('Email sent successfully:', emailResponse);

    // Log notification for analytics
    await supabaseClient
      .from('notification_log')
      .insert({
        user_id: user.id,
        type,
        email,
        status: 'sent',
        external_id: emailResponse.id
      });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
