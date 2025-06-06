
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const sendNotification = async (
    type: 'welcome' | 'payment_confirmation' | 'booking_started' | 'booking_success' | 'booking_failed' | 'subscription_expiry',
    email: string,
    data: any = {}
  ) => {
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type,
          email,
          data
        }
      });

      if (error) {
        console.error('Error sending notification:', error);
        toast({
          title: "Fel vid skickande av email",
          description: "Kunde inte skicka email-notifikation",
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Notification error:', error);
      return false;
    }
  };

  const sendWelcomeEmail = (email: string) => {
    return sendNotification('welcome', email);
  };

  const sendPaymentConfirmation = (email: string, paymentData: any) => {
    return sendNotification('payment_confirmation', email, paymentData);
  };

  const sendBookingStarted = (email: string, configData: any) => {
    return sendNotification('booking_started', email, configData);
  };

  const sendBookingSuccess = (email: string, bookingData: any) => {
    return sendNotification('booking_success', email, bookingData);
  };

  const sendBookingFailed = (email: string, errorData: any) => {
    return sendNotification('booking_failed', email, errorData);
  };

  const sendSubscriptionExpiry = (email: string, expiryData: any) => {
    return sendNotification('subscription_expiry', email, expiryData);
  };

  return {
    sendWelcomeEmail,
    sendPaymentConfirmation,
    sendBookingStarted,
    sendBookingSuccess,
    sendBookingFailed,
    sendSubscriptionExpiry
  };
};
