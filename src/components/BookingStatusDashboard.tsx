import React, { useState, useEffect, useRef } from 'react';
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
import { VPSPollingService, VPSJobStatus } from '@/services/vpsPollingService';

interface BookingStatusDashboardProps {
  configId: string;
  config: any;
}

const BookingStatusDashboard = ({ configId, config }: BookingStatusDashboardProps) => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  
  const [session, setSession] = useState<BookingSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [vpsJobId, setVpsJobId] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);
  
  // VPS Polling Service
  const vpsServiceRef = useRef<VPSPollingService | null>(null);

  // Initialize VPS service
  useEffect(() => {
    const handleVPSStatusUpdate = (status: VPSJobStatus) => {
      console.log('🔄 VPS Status Update:', status);
      
      // Add log entry for VPS updates
      if (status.message) {
        setLogs(prev => {
          const newLog: LogEntry = {
            message: status.message!,
            timestamp: status.timestamp || new Date().toISOString(),
            stage: status.stage || status.status
          };
          
          const exists = prev.some(log => 
            log.message === newLog.message && 
            Math.abs(new Date(log.timestamp).getTime() - new Date(newLog.timestamp).getTime()) < 2000
          );
          
          if (!exists) {
            return [...prev, newLog].slice(-20);
          }
          return prev;
        });
      }
    };

    const handleVPSQRCode = (qrCode: string) => {
      console.log('📱 VPS QR Code received');
      setQrCodeData(qrCode);
      setShowQRCode(true);
    };

    vpsServiceRef.current = new VPSPollingService(handleVPSStatusUpdate, handleVPSQRCode);

    // Cleanup on unmount
    return () => {
      vpsServiceRef.current?.cleanup();
    };
  }, []);

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

            // Start VPS services if we receive VPS job ID via real-time update
            const newVpsJobId = details.vps_job_id;
            if (newVpsJobId && newVpsJobId !== vpsJobId && vpsServiceRef.current) {
              console.log('🔗 Starting VPS services from real-time update, job:', newVpsJobId);
              setVpsJobId(newVpsJobId);
              vpsServiceRef.current.startSmartQRPolling(newVpsJobId);
              vpsServiceRef.current.connectWebSocket(newVpsJobId);
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

        // Resume VPS services if we have a VPS job ID and session is active
        const vpsJobId = details.vps_job_id || details.job_id;
        const isSessionActive = data && ['initializing', 'browser_starting', 'navigating', 'logging_in', 'bankid_waiting', 'searching', 'searching_times', 'booking_time'].includes(data.status);
        
        if (vpsJobId && isSessionActive && vpsServiceRef.current) {
          console.log('🔄 Resuming VPS services for existing session:', vpsJobId);
          setVpsJobId(vpsJobId);
          vpsServiceRef.current.startSmartQRPolling(vpsJobId);
          vpsServiceRef.current.connectWebSocket(vpsJobId);
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
        body: {
          user_id: user.id,
          config_id: configId,
          config: {
            personnummer: config.personnummer,
            license_type: config.license_type,
            exam: config.exam,
            vehicle_language: config.vehicle_language,
            locations: config.locations,
            date_ranges: config.date_ranges
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Bokning startad",
          description: "Automatisk bokning har startats. Följ statusen nedan.",
        });

        // Start VPS services if we have a VPS job ID
        if (data.vps_result?.job_id || data.job_id) {
          const jobId = data.vps_result?.job_id || data.job_id;
          setVpsJobId(jobId);
          
          console.log('🔗 Starting VPS services for job:', jobId);
          
          if (vpsServiceRef.current) {
            vpsServiceRef.current.startSmartQRPolling(jobId);
            vpsServiceRef.current.connectWebSocket(jobId);
          }
        }

        // Additional fallback: Extract VPS job ID from any available response data
        if (data.success && data.vps_result && !vpsJobId) {
          // Try to extract from VPS response object structure
          const fallbackJobId = data.vps_result.job_id || data.vps_result.vps_job_id || data.session_id;
          if (fallbackJobId && vpsServiceRef.current) {
            console.log('🔧 Fallback: Starting VPS services with extracted job ID:', fallbackJobId);
            setVpsJobId(fallbackJobId);
            vpsServiceRef.current.startSmartQRPolling(fallbackJobId);
            vpsServiceRef.current.connectWebSocket(fallbackJobId);
          }
        }

        // Final fallback: Start VPS polling even without explicit job ID, using response data
        if (data.success && !data.vps_result?.job_id && !data.job_id && !vpsJobId) {
          console.log('⚠️ No direct VPS job ID, trying to extract from session...');
          
          // Try to poll for a VPS job ID that might come via database update
          const pollForVPSJobId = async () => {
            for (let i = 0; i < 10; i++) { // Try for 10 seconds
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const { data: sessionData } = await supabase
                .from('booking_sessions')
                .select('booking_details')
                .eq('user_id', user.id)
                .eq('config_id', configId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (sessionData) {
                const details = getBookingDetails(sessionData.booking_details);
                const vpsJobId = details.vps_job_id;
                
                if (vpsJobId && vpsServiceRef.current) {
                  console.log('✅ Found VPS job ID via polling:', vpsJobId);
                  setVpsJobId(vpsJobId);
                  vpsServiceRef.current.startSmartQRPolling(vpsJobId);
                  vpsServiceRef.current.connectWebSocket(vpsJobId);
                  break;
                }
              }
            }
          };
          
          pollForVPSJobId();
        }
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
      // First, try to stop VPS job if we have a job ID
      if (vpsJobId) {
        try {
          console.log('🛑 Stopping VPS job:', vpsJobId);
          const { error: stopError } = await supabase.functions.invoke('stop-booking', {
            body: { 
              job_id: vpsJobId,
              session_id: session.id 
            }
          });
          
          if (stopError) {
            console.warn('Failed to stop VPS job:', stopError);
          } else {
            console.log('✅ VPS job stopped successfully');
          }
        } catch (vpsError) {
          console.warn('Error stopping VPS job:', vpsError);
          // Continue with local cleanup even if VPS stop fails
        }
      }

      // Update database status
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

      // Stop local VPS services
      if (vpsServiceRef.current) {
        vpsServiceRef.current.cleanup();
      }
      setVpsJobId(null);
      setShowQRCode(false);
      setSession(null); // Clear session to reset UI
    } catch (error) {
      console.error('Error stopping booking:', error);
      toast({
        title: "Kunde inte stoppa bokning",
        description: "Ett fel inträffade när bokningen skulle stoppas",
        variant: "destructive"
      });
    }
  };

  const isActive = session && [
    'initializing', 
    'browser_starting', 
    'navigating', 
    'logging_in', 
    'waiting_bankid',
    'bankid_waiting', 
    'searching', 
    'searching_times',
    'booking',
    'booking_time'
  ].includes(session.status);
  const bookingDetails = getBookingDetails(session?.booking_details);

  return (
    <div className="space-y-6">
      <BookingStatusHeader isConnected={isConnected} vpsJobId={vpsJobId} />

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
      {showQRCode && qrCodeData && (
        <QRCodeDisplay 
          qrCode={qrCodeData}
          jobId={vpsJobId || undefined}
          onRefresh={() => {
            console.log('🔄 Manual QR refresh requested...');
            if (vpsJobId && vpsServiceRef.current) {
              vpsServiceRef.current.refreshQRCode(vpsJobId);
            }
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
