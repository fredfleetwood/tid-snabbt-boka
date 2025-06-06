
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { logSecurityEvent } from '@/utils/security';
import { useSubscription } from '@/hooks/useSubscription';
import { useNotifications } from '@/hooks/useNotifications';
import DashboardHeader from '@/components/DashboardHeader';
import SubscriptionCard from '@/components/SubscriptionCard';
import BookingConfigForm from '@/components/BookingConfigForm';
import NotificationPreferences from '@/components/NotificationPreferences';
import UserSettingsCard from '@/components/UserSettingsCard';
import { DashboardSkeleton } from '@/components/LoadingStates';

interface BookingConfig {
  id: string;
  personnummer: string;
  license_type: string;
  exam: string;
  vehicle_language: string[];
  locations: string[];
  is_active: boolean;
  created_at: string;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [configs, setConfigs] = useState<BookingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshSubscription } = useSubscription();
  const { sendWelcomeEmail, sendPaymentConfirmation } = useNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { page: 'dashboard' });
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      logSecurityEvent('DASHBOARD_ACCESS', { userId: user.id });
      fetchBookingConfigs();
      
      // Check for payment success/cancellation
      if (searchParams.get('success') === 'true') {
        toast({
          title: "Betalning genomförd!",
          description: "Din prenumeration är nu aktiv. Det kan ta en minut innan statusen uppdateras.",
        });
        
        // Send payment confirmation email
        sendPaymentConfirmation(user.email!, {
          amount: 300,
          currency: 'SEK',
          subscriptionPeriod: '1 månad'
        });
        
        // Refresh subscription status after successful payment
        setTimeout(() => {
          refreshSubscription();
        }, 2000);
      } else if (searchParams.get('canceled') === 'true') {
        toast({
          title: "Betalning avbruten",
          description: "Din betalning avbröts. Du kan försöka igen när som helst.",
          variant: "destructive",
        });
      }
      
      // Check if this is a new user (first login)
      const isNewUser = searchParams.get('new_user');
      if (isNewUser === 'true') {
        sendWelcomeEmail(user.email!);
      }
    }
  }, [user, searchParams, toast, refreshSubscription, sendWelcomeEmail, sendPaymentConfirmation]);

  const fetchBookingConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching booking configs:', error);
        logSecurityEvent('DATA_FETCH_ERROR', { error: error.message });
        toast({
          title: "Fel",
          description: "Kunde inte hämta bokningskonfigurationer",
          variant: "destructive",
        });
      } else {
        setConfigs(data || []);
        logSecurityEvent('DATA_FETCH_SUCCESS', { configCount: data?.length || 0 });
      }
    } catch (error) {
      console.error('Error:', error);
      logSecurityEvent('UNEXPECTED_ERROR', { error });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <SubscriptionCard />
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <BookingConfigForm />
          </div>
          <div className="space-y-6">
            <NotificationPreferences />
            <UserSettingsCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
