import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { logSecurityEvent } from '@/utils/security';

const SubscriptionStatus = () => {
  const { user } = useAuth();
  const { subscribed, status, subscription_end, loading, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const [managingSubscription, setManagingSubscription] = useState(false);

  const handleManageSubscription = async () => {
    if (!user) return;

    setManagingSubscription(true);
    logSecurityEvent('SUBSCRIPTION_MANAGEMENT_INITIATED', { userId: user.id });

    try {
      console.log('[CUSTOMER-PORTAL] 🔄 Checking session validity...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.log('[CUSTOMER-PORTAL] ⚠️ Session invalid, attempting refresh...');
        
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession?.access_token) {
          console.log('[CUSTOMER-PORTAL] ❌ Session refresh failed');
          toast({
            title: "Session upphörd",
            description: "Din session har upphört. Vänligen ladda om sidan och logga in igen.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('[CUSTOMER-PORTAL] ✅ Session refreshed successfully');
      }
      
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        console.error('Customer portal error:', error);
        logSecurityEvent('SUBSCRIPTION_MANAGEMENT_ERROR', { error: error.message });
        
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
          description: "Kunde inte öppna hanteringsportalen. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        logSecurityEvent('SUBSCRIPTION_MANAGEMENT_REDIRECT', { url: data.url });
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Manage subscription error:', error);
      logSecurityEvent('SUBSCRIPTION_MANAGEMENT_UNEXPECTED_ERROR', { error });
      toast({
        title: "Fel",
        description: "Ett oväntat fel uppstod. Försök igen senare.",
        variant: "destructive",
      });
    } finally {
      setManagingSubscription(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Kontrollerar prenumerationsstatus...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {subscribed ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aktiv prenumeration
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Ingen aktiv prenumeration
            </>
          )}
        </CardTitle>
        <CardDescription>
          {subscribed 
            ? "Du har tillgång till alla premium-funktioner" 
            : "Uppgradera för att få tillgång till automatisk bokning"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Status:</span>
            <span className={`font-medium ${
              status === 'active' ? 'text-green-600' : 
              status === 'grace_period' ? 'text-orange-500' : 
              'text-gray-500'
            }`}>
              {status === 'active' ? 'Aktiv' : 
               status === 'grace_period' ? 'Nådperiod' : 
               'Inaktiv'}
            </span>
          </div>
          
          {subscription_end && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Förnyelse:</span>
              <span className="font-medium">
                {new Date(subscription_end).toLocaleDateString('sv-SE')}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshSubscription}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Uppdatera status
          </Button>
          
          {subscribed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={managingSubscription}
            >
              {managingSubscription ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Hantera prenumeration
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
