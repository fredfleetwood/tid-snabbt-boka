
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupportMessageRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: SupportMessageRequest = await req.json();

    // Send email to support team
    const emailResponse = await resend.emails.send({
      from: "Support <support@snabbtkorprov.se>",
      to: ["support@snabbtkorprov.se"],
      subject: `Support: ${subject}`,
      html: `
        <h2>Nytt supportmeddelande</h2>
        <p><strong>Från:</strong> ${name} (${email})</p>
        <p><strong>Ämne:</strong> ${subject}</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #2563eb;">
          <h3>Meddelande:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Skickat via snabbtkorprov.se support-formulär</p>
      `,
    });

    console.log('Support message sent:', emailResponse);

    // Send confirmation email to user
    await resend.emails.send({
      from: "Snabbtkörprov.se <noreply@snabbtkorprov.se>",
      to: [email],
      subject: "Vi har mottagit ditt meddelande",
      html: `
        <h2>Tack för ditt meddelande!</h2>
        <p>Hej ${name},</p>
        <p>Vi har mottagit ditt meddelande och kommer att kontakta dig inom 24 timmar på vardagar.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3>Ditt meddelande:</h3>
          <p><strong>Ämne:</strong> ${subject}</p>
          <p style="white-space: pre-wrap; margin-top: 10px;">${message}</p>
        </div>
        <p>Med vänliga hälsningar,<br/>Teamet på Snabbtkörprov.se</p>
      `,
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Support message sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending support message:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
