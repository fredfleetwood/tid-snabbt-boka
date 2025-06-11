import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/security';

interface SubscriptionStatus {
  subscribed: boolean;
  status: string;
  subscription_end?: string;
  loading: boolean;
  error?: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: false,
    status: 'inactive',
    loading: true,
  });

  const checkSubscription = async () => {
    console.log('[SUBSCRIPTION] 🔄 Checking subscription status...');
    console.log('[SUBSCRIPTION] 👤 User:', user?.id);
    
    if (!user) {
      console.log('[SUBSCRIPTION] ❌ No user found, setting not subscribed');
      setSubscription({
        subscribed: false,
        status: 'inactive',
        loading: false,
      });
      return;
    }

    try {
      console.log('[SUBSCRIPTION] 🔄 Calling check-subscription Edge Function...');
      logSecurityEvent('SUBSCRIPTION_CHECK_INITIATED', { userId: user.id });
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      console.log('[SUBSCRIPTION] 📨 Edge Function response:');
      console.log('[SUBSCRIPTION] 📊 Data:', data);
      console.log('[SUBSCRIPTION] ❓ Error:', error);
      
      if (error) {
        console.error('[SUBSCRIPTION] ❌ Edge Function error:', error);
        console.log('[SUBSCRIPTION] 🧪 TEST MODE: Defaulting to subscribed=true for testing');
        logSecurityEvent('SUBSCRIPTION_CHECK_ERROR', { error: error.message });
        
        // For testing purposes, default to subscribed if Edge Function fails
        setSubscription({
          subscribed: true, // Changed for testing
          status: 'test_mode',
          loading: false,
          error: `Edge Function failed: ${error.message} (defaulting to subscribed for testing)`
        });
        return;
      }

      console.log('[SUBSCRIPTION] ✅ Subscription check successful');
      console.log('[SUBSCRIPTION] 📊 Returned subscribed value:', data.subscribed);
      
      // For testing: if subscription check returns false, override to true
      const finalSubscribed = data.subscribed || true; // Always true for testing
      console.log('[SUBSCRIPTION] 🧪 TEST MODE: Final subscribed value (overridden):', finalSubscribed);
      
      logSecurityEvent('SUBSCRIPTION_CHECK_SUCCESS', { 
        subscribed: data.subscribed, 
        status: data.status,
        overridden_for_testing: !data.subscribed
      });
      
      setSubscription({
        subscribed: finalSubscribed, // Use overridden value
        status: data.subscribed ? (data.status || 'active') : 'test_mode',
        subscription_end: data.subscription_end,
        loading: false,
      });
      
      console.log('[SUBSCRIPTION] 📊 Final subscription state:', {
        subscribed: finalSubscribed,
        status: data.subscribed ? (data.status || 'active') : 'test_mode',
        subscription_end: data.subscription_end
      });
      
    } catch (error) {
      console.error('[SUBSCRIPTION] ❌ Exception in checkSubscription:', error);
      console.log('[SUBSCRIPTION] 🧪 TEST MODE: Defaulting to subscribed=true for testing');
      logSecurityEvent('SUBSCRIPTION_CHECK_UNEXPECTED_ERROR', { error });
      
      // For testing purposes, default to subscribed if exception occurs
      setSubscription({
        subscribed: true, // Changed for testing
        status: 'test_mode',
        loading: false,
        error: 'Failed to check subscription status (defaulting to subscribed for testing)',
      });
    }
  };

  const refreshSubscription = () => {
    setSubscription(prev => ({ ...prev, loading: true }));
    checkSubscription();
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  return {
    ...subscription,
    refreshSubscription,
  };
};
