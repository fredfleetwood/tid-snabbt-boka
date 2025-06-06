
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const logSecurityEvent = (event: string, details?: any) => {
  console.log(`[SECURITY] ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
};

const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit) {
    rateLimitMap.set(userId, { count: 1, lastRequest: now });
    return false;
  }
  
  // Reset if window has passed (1 minute)
  if (now - userLimit.lastRequest > 60000) {
    rateLimitMap.set(userId, { count: 1, lastRequest: now });
    return false;
  }
  
  // Check if limit exceeded (max 10 requests per minute)
  if (userLimit.count >= 10) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', { userId, count: userLimit.count });
    return true;
  }
  
  userLimit.count++;
  userLimit.lastRequest = now;
  return false;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logSecurityEvent('MISSING_STRIPE_KEY');
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logSecurityEvent('MISSING_AUTH_HEADER');
      throw new Error("No authorization header provided");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logSecurityEvent('AUTH_ERROR', { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      logSecurityEvent('INVALID_USER');
      throw new Error("User not authenticated or email not available");
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Rate limiting
    if (isRateLimited(user.id)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating inactive state");
      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: null,
        status: 'inactive',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        status: 'inactive' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let status = 'inactive';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      status = 'active';
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd 
      });
    } else {
      logStep("No active subscription found");
    }

    // Update subscription status in database with additional security validation
    const updateResult = await supabaseClient.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      status: status,
      subscription_expires: subscriptionEnd,
      currency: 'sek',
      amount_paid: hasActiveSub ? 30000 : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (updateResult.error) {
      logSecurityEvent('DATABASE_UPDATE_ERROR', { error: updateResult.error.message });
      throw updateResult.error;
    }

    logStep("Updated database with subscription info", { 
      subscribed: hasActiveSub, 
      status: status 
    });

    logSecurityEvent('SUBSCRIPTION_CHECK_SUCCESS', {
      userId: user.id,
      subscribed: hasActiveSub,
      status: status
    });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      status: status,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    logSecurityEvent('FUNCTION_ERROR', { error: errorMessage });
    
    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
