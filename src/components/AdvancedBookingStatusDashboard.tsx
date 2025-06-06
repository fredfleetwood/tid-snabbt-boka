
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Play, Square, RotateCcw, Activity } from 'lucide-react';
import QRCodeDisplay from './booking/QRCodeDisplay';
import LiveUpdatesLog from './booking/LiveUpdatesLog';
import { BookingSession, LogEntry } from './booking/types';
import { getBookingDetails } from './booking/utils';

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

  // Enhanced status mapping
  const statusMessages = {
    'initializing': { emoji: '🚀', text: 'Startar automatisering...', progress: 5 },
    'browser_starting': { emoji: '🌍', text: 'Startar webbläsare...', progress: 10 },
    'navigating': { emoji: '🌐', text: 'Navigerar till Trafikverket...', progress: 15 },
    'cookies_accepted': { emoji: '🍪', text: 'Accepterade cookies', progress: 20 },
    'logging_in': { emoji: '🔐', text: 'Startar inloggning...', progress: 25 },
    'bankid_waiting': { emoji: '📱', text: 'Väntar på BankID...', progress: 30 },
    'login_success': { emoji: '✅', text: 'Inloggning lyckades!', progress: 40 },
    'selecting_locations': { emoji: '📍', text: 'Väljer provplatser...', progress: 45 },
    'locations_confirmed': { emoji: '✅', text: 'Alla provplatser valda', progress: 50 },
    'searching': { emoji: '🔄', text: 'Söker lediga tider...', progress: 60 },
    'searching_times': { emoji: '🔍', text: 'Analyserar tillgängliga tider...', progress: 70 },
    'times_found': { emoji: '📅', text: 'Hittade lediga tider!', progress: 75 },
    'booking_time': { emoji: '⏰', text: 'Bokar vald tid...', progress: 85 },
    'booking_complete': { emoji: '🎉', text: 'Bokning genomförd!', progress: 100 },
    'completed': { emoji: '🎉', text: 'Automatisering klar!', progress: 100 },
    'error': { emoji: '❌', text: 'Fel uppstod', progress: 0 },
    'cancelled': { emoji: '⏹️', text: 'Stoppad av användare', progress: 0 }
  };

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
      }
    };

    loadSession();
  }, [user, configId]);

  const startAdvancedBooking = async () => {
    console.log('🚀 Starting advanced booking automation...');
    console.log('📋 Debug info:', {
      user: user?.id,
      configId: configId,
      subscribed: subscribed
    });

    if (!subscribed) {
      toast({
        title: "Aktivt abonnemang krävs",
        description: "Du behöver en aktiv prenumeration för att starta automatisering",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Inloggning krävs",
        description: "Du måste vara inloggad för att starta automatisering",
        variant: "destructive"
      });
      return;
    }

    if (!configId) {
      toast({
        title: "Ingen konfiguration vald",
        description: "Du måste ha en bokningskonfiguration för att starta automatisering",
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
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ Auth session error:', sessionError);
        throw new Error('Authentication session expired. Please refresh and try again.');
      }

      console.log('✅ Authentication session valid');
      console.log('📤 Calling start-booking with config_id:', configId);

      // Call Edge Function with explicit data
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

      console.log('📥 Function response status:', response.status);
      console.log('📥 Function response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Function error response:', errorText);
        throw new Error(`Edge Function error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Function response data:', data);

      if (data?.error) {
        console.error('❌ Function returned error:', data.error);
        throw new Error(data.error);
      }

      if (data?.success) {
        console.log('✅ Automation started successfully');
        toast({
          title: "🚀 Automatisering startad",
          description: "Avancerad automatisering har startats framgångsrikt.",
        });
      } else {
        console.error('❌ Unexpected response format:', data);
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      console.error('💥 Error starting automation:', error);
      
      let errorMessage = 'Ett oväntat fel inträffade';
      
      if (error.message?.includes('Authentication')) {
        errorMessage = 'Autentiseringsfel. Vänligen logga in igen.';
      } else if (error.message?.includes('booking configuration')) {
        errorMessage = 'Ingen bokningskonfiguration hittades. Skapa en först.';
      } else if (error.message?.includes('subscription')) {
        errorMessage = 'Prenumerationsproblem. Kontrollera din prenumeration.';
      } else if (error.message?.includes('Trigger.dev')) {
        errorMessage = 'Automatiseringstjänsten är inte tillgänglig just nu.';
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
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Activity className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Ansluten till realtidsuppdateringar' : 'Ansluter...'}
          </span>
        </div>
        <Badge variant={isConnected ? 'default' : 'secondary'}>
          {isConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {/* Debug Information */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Debug Information</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>User ID: {user?.id || 'Not logged in'}</div>
          <div>Config ID: {configId || 'Not provided'}</div>
          <div>Subscribed: {subscribed ? 'Yes' : 'No'}</div>
          <div>Current Session: {session?.id || 'None'}</div>
        </div>
      </div>

      {/* Status Display */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{currentStatus.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold">{currentStatus.text}</h3>
              {session?.started_at && (
                <p className="text-sm text-gray-600">
                  Startad: {new Date(session.started_at).toLocaleString('sv-SE')}
                </p>
              )}
            </div>
          </div>
          <Badge className={`${session?.status === 'completed' ? 'bg-green-600' : session?.status === 'error' ? 'bg-red-600' : 'bg-blue-600'} text-white`}>
            {session?.status || 'idle'}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Framsteg</span>
            <span>{currentStatus.progress}%</span>
          </div>
          <Progress value={currentStatus.progress} className="w-full" />
        </div>

        {/* Tracking Information */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-blue-600">{cycleCount}</div>
            <div className="text-sm text-gray-600">Sök-cykler</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-green-600">{slotsFound}</div>
            <div className="text-sm text-gray-600">Tider hittade</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-purple-600">{logs.length}</div>
            <div className="text-sm text-gray-600">Logg-poster</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-orange-600">
              {session?.created_at ? Math.floor((Date.now() - new Date(session.created_at).getTime()) / 60000) : 0}
            </div>
            <div className="text-sm text-gray-600">Minuter aktiv</div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-3">
          {!isActive ? (
            <Button 
              onClick={startAdvancedBooking} 
              disabled={isStarting || !subscribed || !configId}
              className="bg-green-600 hover:bg-green-700"
            >
              {isStarting ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Startar...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Starta avancerad automatisering
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={stopAdvancedBooking} 
              disabled={isStopping}
              variant="destructive"
            >
              {isStopping ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Stoppar...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stoppa automatisering
                </>
              )}
            </Button>
          )}
          
          {session && (
            <Button 
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Uppdatera status
            </Button>
          )}
        </div>
      </div>

      {/* QR Code Display */}
      {showQRCode && qrCodeData && (
        <QRCodeDisplay 
          qrCode={qrCodeData}
          onRefresh={() => console.log('Refreshing QR code...')}
        />
      )}

      {/* Error Display */}
      {session?.status === 'error' && session.error_message && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Automationsfel:</strong> {session.error_message}
          </AlertDescription>
        </Alert>
      )}

      {/* Live Updates Log */}
      <LiveUpdatesLog logs={logs} />
    </div>
  );
};

export default AdvancedBookingStatusDashboard;
