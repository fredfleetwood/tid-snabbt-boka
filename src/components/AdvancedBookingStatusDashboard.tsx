
import React, { useState, useEffect, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import QRCodeDisplay from './booking/QRCodeDisplay';
import LiveUpdatesLog from './booking/LiveUpdatesLog';
import ConnectionStatus from './booking/ConnectionStatus';
import DebugInformation from './booking/DebugInformation';
import StatusDisplaySection from './booking/StatusDisplaySection';
import MetricsGrid from './booking/MetricsGrid';
import ControlButtons from './booking/ControlButtons';
import { BookingSession, LogEntry } from './booking/types';
import { getBookingDetails } from './booking/utils';
import { statusMessages } from './booking/BookingStatusMessages';
import { VPSPollingService, VPSJobStatus } from '@/services/vpsPollingService';

interface AdvancedBookingStatusDashboardProps {
  configId: string;
}

const AdvancedBookingStatusDashboard = ({ configId }: AdvancedBookingStatusDashboardProps) => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  
  const [session, setSession] = useState<BookingSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cycleCount, setCycleCount] = useState(0);
  const [slotsFound, setSlotsFound] = useState(0);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [vpsJobId, setVpsJobId] = useState<string | null>(null);
  
  // VPS Polling Service
  const vpsServiceRef = useRef<VPSPollingService | null>(null);

  // Initialize VPS service
  useEffect(() => {
    const handleVPSStatusUpdate = (status: VPSJobStatus) => {
      console.log('🔄 VPS Status Update:', status);
      
      // Update session-like data based on VPS status
      if (status.stage === 'bankid_waiting' || status.bankid_status === 'waiting') {
        // Don't change QR display here, let QR polling handle it
      }
      
      // Add log entry for VPS updates
      if (status.message) {
        setLogs(prev => {
          const newLog: LogEntry = {
            message: status.message!,
            timestamp: status.timestamp || new Date().toISOString(),
            stage: status.stage || status.status,
            cycle: status.progress,
            operation: 'vps_update'
          };
          
          const exists = prev.some(log => 
            log.message === newLog.message && 
            Math.abs(new Date(log.timestamp).getTime() - new Date(newLog.timestamp).getTime()) < 2000
          );
          
          if (!exists) {
            return [...prev, newLog].slice(-50);
          }
          return prev;
        });
      }
      
      // Update metrics
      if (status.slots_found !== undefined) {
        setSlotsFound(status.slots_found);
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

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('advanced-booking-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time session update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedSession = payload.new as BookingSession;
            setSession(updatedSession);
            
            const details = getBookingDetails(updatedSession.booking_details);
            
            if (details.cycle_count !== undefined) {
              setCycleCount(details.cycle_count);
            }
            if (details.slots_found !== undefined) {
              setSlotsFound(details.slots_found);
            }

            if (updatedSession.status === 'bankid_waiting' && details.qr_code) {
              setQrCodeData(details.qr_code);
              setShowQRCode(true);
            } else if (updatedSession.status !== 'bankid_waiting') {
              setShowQRCode(false);
            }
            
            if (details?.message) {
              setLogs(prev => {
                const newLog: LogEntry = {
                  message: details.message!,
                  timestamp: details.timestamp || new Date().toISOString(),
                  stage: details.stage || updatedSession.status,
                  cycle: details.cycle_count,
                  operation: details.current_operation
                };
                
                const exists = prev.some(log => 
                  log.message === newLog.message && 
                  Math.abs(new Date(log.timestamp).getTime() - new Date(newLog.timestamp).getTime()) < 1000
                );
                
                if (!exists) {
                  return [...prev, newLog].slice(-50);
                }
                return prev;
              });
            }
            
            // Toast notifications
            if (updatedSession.status === 'completed') {
              toast({
                title: "🎉 Automatisering klar!",
                description: "Din provtid har bokats framgångsrikt.",
              });
            } else if (updatedSession.status === 'error') {
              toast({
                title: "❌ Fel uppstod",
                description: updatedSession.error_message || "Ett fel inträffade under automationen.",
                variant: "destructive"
              });
            } else if (updatedSession.status === 'times_found') {
              toast({
                title: "📅 Lediga tider hittade!",
                description: `Hittade ${details.slots_found || 'flera'} lediga provtider.`,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('📡 Real-time subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Load existing session
  useEffect(() => {
    if (!user || !configId) return;

    const loadSession = async () => {
      console.log('📊 Loading session for user:', user.id, 'config:', configId);
      
      const { data, error } = await supabase
        .from('booking_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('config_id', configId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading session:', error);
        return;
      }

      console.log('📄 Loaded session:', data);

      if (data) {
        setSession(data);
        
        const details = getBookingDetails(data.booking_details);
        
        if (details.cycle_count !== undefined) setCycleCount(details.cycle_count);
        if (details.slots_found !== undefined) setSlotsFound(details.slots_found);
        
        if (details.logs) {
          setLogs(details.logs);
        } else if (details.message) {
          setLogs([{
            message: details.message,
            timestamp: details.timestamp || data.created_at || new Date().toISOString(),
            stage: details.stage || data.status,
            cycle: details.cycle_count,
            operation: details.current_operation
          }]);
        }

        // Resume VPS services if we have a VPS job ID and session is active
        const vpsJobId = details.vps_job_id || details.job_id;
        const isSessionActive = data && ['initializing', 'browser_starting', 'navigating', 'logging_in', 'bankid_waiting', 'searching', 'searching_times', 'booking_time'].includes(data.status);
        
        if (vpsJobId && isSessionActive && vpsServiceRef.current) {
          console.log('🔄 Resuming VPS services for existing session:', vpsJobId);
          setVpsJobId(vpsJobId);
          vpsServiceRef.current.startQRPolling(vpsJobId);
          vpsServiceRef.current.connectWebSocket(vpsJobId);
        }
      }
    };

    loadSession();
  }, [user, configId]);

  const startAdvancedBooking = async () => {
    console.log('🚀 Starting advanced booking automation...');

    if (!subscribed) {
      toast({
        title: "Aktivt abonnemang krävs",
        description: "Du behöver en aktiv prenumeration för att starta automatisering",
        variant: "destructive"
      });
      return;
    }

    if (!user || !configId) {
      toast({
        title: "Konfiguration krävs",
        description: "Du måste vara inloggad och ha en bokningskonfiguration",
        variant: "destructive"
      });
      return;
    }

    setIsStarting(true);
    setLogs([]);
    setCycleCount(0);
    setSlotsFound(0);
    setShowQRCode(false);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication session expired. Please refresh and try again.');
      }

      const response = await fetch(`https://kqemgnbqjrqepzkigfcx.supabase.co/functions/v1/start-booking`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZW1nbmJxanJxZXB6a2lnZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTQ4MDEsImV4cCI6MjA2NDc5MDgwMX0.tnPomyWLMseJX0GlrUeO63Ig9GRZSTh1O1Fi2p9q8mc'
        },
        body: JSON.stringify({ 
          config_id: configId,
          user_id: user.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success) {
        toast({
          title: "🚀 Automatisering startad",
          description: "Avancerad automatisering har startats framgångsrikt.",
        });

        // Extract VPS job ID and start VPS services
        if (data.vps_result?.job_id || data.job_id) {
          const jobId = data.vps_result?.job_id || data.job_id;
          setVpsJobId(jobId);
          
          console.log('🔗 Starting VPS services for job:', jobId);
          
          // Start VPS polling and WebSocket
          if (vpsServiceRef.current) {
            vpsServiceRef.current.startQRPolling(jobId);
            vpsServiceRef.current.connectWebSocket(jobId);
          }
        }
      }
    } catch (error) {
      console.error('💥 Error starting automation:', error);
      
      let errorMessage = 'Ett oväntat fel inträffade';
      
      if (error.message?.includes('Authentication')) {
        errorMessage = 'Autentiseringsfel. Vänligen logga in igen.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Kunde inte starta automatisering",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  const stopAdvancedBooking = async () => {
    if (!session) return;

    setIsStopping(true);

    try {
      const { data, error } = await supabase.functions.invoke('stop-booking', {
        body: { session_id: session.id }
      });

      if (error) throw error;

      toast({
        title: "⏹️ Automatisering stoppad",
        description: "Automatiseringen har stoppats säkert.",
      });

      // Stop VPS services
      if (vpsServiceRef.current) {
        vpsServiceRef.current.cleanup();
      }
      setVpsJobId(null);
      setShowQRCode(false);
    } catch (error) {
      console.error('Error stopping automation:', error);
      toast({
        title: "Kunde inte stoppa automatisering",
        description: "Ett fel inträffade när automationen skulle stoppas",
        variant: "destructive"
      });
    } finally {
      setIsStopping(false);
    }
  };

  const currentStatus = statusMessages[session?.status as keyof typeof statusMessages] || statusMessages.initializing;
  const isActive = session && ['initializing', 'browser_starting', 'navigating', 'logging_in', 'bankid_waiting', 'searching', 'searching_times', 'booking_time'].includes(session.status);

  return (
    <div className="space-y-6">
      <ConnectionStatus isConnected={isConnected} />
      
      <DebugInformation 
        userId={user?.id}
        configId={configId}
        subscribed={subscribed}
        session={session}
        vpsJobId={vpsJobId}
      />

      <StatusDisplaySection currentStatus={currentStatus} session={session} />
      
      <MetricsGrid 
        cycleCount={cycleCount}
        slotsFound={slotsFound}
        logs={logs}
        session={session}
      />

      <ControlButtons
        isActive={!!isActive}
        isStarting={isStarting}
        isStopping={isStopping}
        subscribed={subscribed}
        configId={configId}
        session={session}
        onStart={startAdvancedBooking}
        onStop={stopAdvancedBooking}
      />

      {showQRCode && qrCodeData && (
        <QRCodeDisplay 
          qrCode={qrCodeData}
          onRefresh={() => {
            console.log('🔄 Refreshing QR code...');
            if (vpsJobId && vpsServiceRef.current) {
                                vpsServiceRef.current.startQRPolling(vpsJobId, 1000); // Optimized 1s polling for BankID QR refresh
            }
          }}
        />
      )}

      {session?.status === 'error' && session.error_message && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Automationsfel:</strong> {session.error_message}
          </AlertDescription>
        </Alert>
      )}

      <LiveUpdatesLog logs={logs} />
    </div>
  );
};

export default AdvancedBookingStatusDashboard;
