
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BookingSession {
  id: string;
  status: string;
  booking_details: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  config_id: string;
}

export const useBookingStatus = (configId?: string) => {
  const { user } = useAuth();
  const [session, setSession] = useState<BookingSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Load existing session
    const loadSession = async () => {
      if (configId) {
        const { data } = await supabase
          .from('booking_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('config_id', configId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setSession(data);
      }
      setLoading(false);
    };

    loadSession();

    // Set up real-time subscription
    const channel = supabase
      .channel('booking-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedSession = payload.new as BookingSession;
            
            // Only update if it's for the current config or if no specific config
            if (!configId || updatedSession.config_id === configId) {
              setSession(updatedSession);
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, configId]);

  const isActive = session && ['initializing', 'waiting_bankid', 'searching', 'booking'].includes(session.status);

  return {
    session,
    isConnected,
    loading,
    isActive
  };
};
