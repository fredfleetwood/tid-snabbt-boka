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
      console.log('[CREATE-CHECKOUT] 🔄 Checking session validity...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.log('[CREATE-CHECKOUT] ⚠️ Session invalid, attempting refresh...');
        
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession?.access_token) {
          console.log('[CREATE-CHECKOUT] ❌ Session refresh failed');
          toast({
            title: "Session upphörd",
            description: "Din session har upphört. Vänligen ladda om sidan och logga in igen.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('[CREATE-CHECKOUT] ✅ Session refreshed successfully');
      }
      
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) {
        console.error('Checkout error:', error);
        logSecurityEvent('SUBSCRIPTION_CHECKOUT_ERROR', { error: error.message });
        
        if (error.message?.includes('JWT') || error.message?.includes('auth') || error.message?.includes('401')) {
          toast({
            title: "Autentiseringsfel",
            description: "Din session har upphört. Vänligen ladda om sidan och försök igen.",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Fel",
          description: "Kunde inte starta betalningsprocessen. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        logSecurityEvent('SUBSCRIPTION_CHECKOUT_REDIRECT', { url: data.url });
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
