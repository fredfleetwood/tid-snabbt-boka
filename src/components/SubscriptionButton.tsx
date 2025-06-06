
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CreditCard } from 'lucide-react';
import { logSecurityEvent } from '@/utils/security';

interface SubscriptionButtonProps {
  subscribed?: boolean;
}

const SubscriptionButton = ({ subscribed = false }: SubscriptionButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubscription = async () => {
    if (!user) {
      toast({
        title: "Inloggning krävs",
        description: "Du måste logga in för att köpa en prenumeration",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    logSecurityEvent('SUBSCRIPTION_CHECKOUT_INITIATED', { userId: user.id });

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) {
        console.error('Checkout error:', error);
        logSecurityEvent('SUBSCRIPTION_CHECKOUT_ERROR', { error: error.message });
        toast({
          title: "Fel",
          description: "Kunde inte starta betalningsprocessen. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        logSecurityEvent('SUBSCRIPTION_CHECKOUT_REDIRECT', { url: data.url });
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      logSecurityEvent('SUBSCRIPTION_CHECKOUT_UNEXPECTED_ERROR', { error });
      toast({
        title: "Fel",
        description: "Ett oväntat fel uppstod. Försök igen senare.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return null; // Don't show subscription button if already subscribed
  }

  return (
    <Button 
      onClick={handleSubscription}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg font-semibold"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Laddar...
        </>
      ) : (
        <>
          <CreditCard className="h-5 w-5 mr-2" />
          Kom igång nu - 300kr
        </>
      )}
    </Button>
  );
};

export default SubscriptionButton;
