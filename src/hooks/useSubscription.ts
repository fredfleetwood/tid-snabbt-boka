
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
    if (!user) {
      setSubscription({
        subscribed: false,
        status: 'inactive',
        loading: false,
      });
      return;
    }

    try {
      logSecurityEvent('SUBSCRIPTION_CHECK_INITIATED', { userId: user.id });
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        logSecurityEvent('SUBSCRIPTION_CHECK_ERROR', { error: error.message });
        setSubscription(prev => ({ ...prev, loading: false, error: error.message }));
        return;
      }

      logSecurityEvent('SUBSCRIPTION_CHECK_SUCCESS', { 
        subscribed: data.subscribed, 
        status: data.status 
      });
      
      setSubscription({
        subscribed: data.subscribed || false,
        status: data.status || 'inactive',
        subscription_end: data.subscription_end,
        loading: false,
      });
    } catch (error) {
      console.error('Subscription check error:', error);
      logSecurityEvent('SUBSCRIPTION_CHECK_UNEXPECTED_ERROR', { error });
      setSubscription(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to check subscription status',
      }));
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
