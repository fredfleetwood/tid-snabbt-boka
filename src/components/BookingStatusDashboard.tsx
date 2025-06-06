
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import QRCodeDisplay from './booking/QRCodeDisplay';
import LiveUpdatesLog from './booking/LiveUpdatesLog';
import BookingStatusHeader from './booking/BookingStatusHeader';
import BookingStatusDisplay from './booking/BookingStatusDisplay';
import BookingControls from './booking/BookingControls';
import { BookingSession, BookingDetails, LogEntry } from './booking/types';
import { getBookingDetails } from './booking/utils';

interface BookingStatusDashboardProps {
  configId: string;
}

const BookingStatusDashboard = ({ configId }: BookingStatusDashboardProps) => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  
  const [session, setSession] = useState<BookingSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

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
          console.log('Real-time session update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedSession = payload.new as BookingSession;
            setSession(updatedSession);
            
            // Add to logs if there's a new message
            const details = getBookingDetails(updatedSession.booking_details);
            if (details?.message) {
              setLogs(prev => {
                const newLog = {
                  message: details.message!,
                  timestamp: details.timestamp || new Date().toISOString(),
                  stage: details.stage || updatedSession.status
                };
                
                // Avoid duplicates
                const exists = prev.some(log => 
                  log.message === newLog.message && 
                  Math.abs(new Date(log.timestamp).getTime() - new Date(newLog.timestamp).getTime()) < 1000
                );
                
                if (!exists) {
                  return [...prev, newLog].slice(-20); // Keep last 20 logs
                }
                return prev;
              });
            }
            
            // Show toast for important status changes
            if (updatedSession.status === 'completed') {
              toast({
                title: "Bokning klar!",
                description: "Din provtid har bokats framgångsrikt. Bekräftelse skickas via email.",
              });
            } else if (updatedSession.status === 'error') {
              toast({
                title: "Fel uppstod",
                description: updatedSession.error_message || "Ett oväntat fel inträffade under bokningen.",
                variant: "destructive"
              });
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('Real-time subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Load existing session
  useEffect(() => {
    if (!user || !configId) return;

    const loadSession = async () => {
      const { data, error } = await supabase
        .from('booking_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('config_id', configId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading session:', error);
        return;
      }

      if (data) {
        setSession(data);
        
        // Load logs from session details
        const details = getBookingDetails(data.booking_details);
        if (details.logs) {
          setLogs(details.logs);
        } else if (details.message) {
          setLogs([{
            message: details.message,
            timestamp: details.timestamp || data.created_at,
            stage: details.stage || data.status
          }]);
        }
      }
    };

    loadSession();
  }, [user, configId]);

  const startBooking = async () => {
    if (!subscribed) {
      toast({
        title: "Aktivt abonnemang krävs",
        description: "Du behöver en aktiv prenumeration för att starta automatisk bokning",
        variant: "destructive"
      });
      return;
    }

    setIsStarting(true);
    setLogs([]); // Clear previous logs

    try {
      const { data, error } = await supabase.functions.invoke('start-booking', {
        body: { config_id: configId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Bokning startad",
          description: "Automatisk bokning har startats. Följ statusen nedan.",
        });
      } else {
        throw new Error(data.error || 'Failed to start booking');
      }
    } catch (error) {
      console.error('Error starting booking:', error);
      toast({
        title: "Kunde inte starta bokning",
        description: error.message || "Ett oväntat fel inträffade",
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  const stopBooking = async () => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('booking_sessions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          booking_details: {
            ...getBookingDetails(session.booking_details),
            stage: 'cancelled',
            message: '⏹️ Bokning stoppad av användare',
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Bokning stoppad",
        description: "Den automatiska bokningen har stoppats.",
      });
    } catch (error) {
      console.error('Error stopping booking:', error);
      toast({
        title: "Kunde inte stoppa bokning",
        description: "Ett fel inträffade när bokningen skulle stoppas",
        variant: "destructive"
      });
    }
  };

  const isActive = session && ['initializing', 'waiting_bankid', 'searching', 'booking'].includes(session.status);
  const bookingDetails = getBookingDetails(session?.booking_details);
  const showQRCode = session?.status === 'waiting_bankid' && bookingDetails.qr_code;

  return (
    <div className="space-y-6">
      <BookingStatusHeader isConnected={isConnected} />

      <BookingStatusDisplay session={session}>
        <BookingControls
          session={session}
          isStarting={isStarting}
          subscribed={subscribed}
          isActive={!!isActive}
          onStart={startBooking}
          onStop={stopBooking}
        />
      </BookingStatusDisplay>

      {/* QR Code Display */}
      {showQRCode && (
        <QRCodeDisplay 
          qrCode={bookingDetails.qr_code!}
          onRefresh={() => {
            // Trigger QR code refresh if needed
            console.log('Refreshing QR code...');
          }}
        />
      )}

      {/* Error Display */}
      {session?.status === 'error' && session.error_message && (
        <Alert variant="destructive">
          <AlertDescription>
            {session.error_message}
          </AlertDescription>
        </Alert>
      )}

      {/* Live Updates Log */}
      <LiveUpdatesLog logs={logs} />
    </div>
  );
};

export default BookingStatusDashboard;
