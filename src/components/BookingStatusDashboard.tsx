
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Play, Square, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import QRCodeDisplay from './booking/QRCodeDisplay';
import LiveUpdatesLog from './booking/LiveUpdatesLog';

interface BookingSession {
  id: string;
  status: string;
  booking_details: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

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
  const [logs, setLogs] = useState<Array<{ message: string; timestamp: string; stage: string }>>([]);

  // Status configuration
  const statusConfig = {
    idle: { emoji: '🔴', text: 'Inte aktiv', color: 'bg-gray-500' },
    initializing: { emoji: '🟡', text: 'Startar webbläsare...', color: 'bg-yellow-500' },
    waiting_bankid: { emoji: '🔵', text: 'Väntar på BankID-inloggning...', color: 'bg-blue-500' },
    searching: { emoji: '🟠', text: 'Söker efter lediga tider...', color: 'bg-orange-500' },
    booking: { emoji: '🟢', text: 'Tid hittad - bokar nu...', color: 'bg-green-500' },
    completed: { emoji: '✅', text: 'Bokning klar!', color: 'bg-green-600' },
    error: { emoji: '❌', text: 'Fel uppstod', color: 'bg-red-500' }
  };

  const currentStatus = statusConfig[session?.status as keyof typeof statusConfig] || statusConfig.idle;

  // Calculate progress percentage
  const getProgress = () => {
    if (!session) return 0;
    const progressMap = {
      idle: 0,
      initializing: 20,
      waiting_bankid: 40,
      searching: 60,
      booking: 80,
      completed: 100,
      error: 0
    };
    return progressMap[session.status as keyof typeof progressMap] || 0;
  };

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
            if (updatedSession.booking_details?.message) {
              setLogs(prev => {
                const newLog = {
                  message: updatedSession.booking_details.message,
                  timestamp: updatedSession.booking_details.timestamp || new Date().toISOString(),
                  stage: updatedSession.booking_details.stage || updatedSession.status
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
        if (data.booking_details?.logs) {
          setLogs(data.booking_details.logs);
        } else if (data.booking_details?.message) {
          setLogs([{
            message: data.booking_details.message,
            timestamp: data.booking_details.timestamp || data.created_at,
            stage: data.booking_details.stage || data.status
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
            ...session.booking_details,
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
  const showQRCode = session?.status === 'waiting_bankid' && session?.booking_details?.qr_code;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bokningsstatus</h3>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Ansluten</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Frånkopplad</span>
            </>
          )}
        </div>
      </div>

      {/* Status Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{currentStatus.emoji}</span>
              <div>
                <h4 className="font-semibold">{currentStatus.text}</h4>
                {session?.started_at && (
                  <p className="text-sm text-gray-600">
                    Startad: {new Date(session.started_at).toLocaleString('sv-SE')}
                  </p>
                )}
              </div>
            </div>
            <Badge className={`${currentStatus.color} text-white`}>
              {session?.status || 'idle'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Framsteg</span>
                <span>{getProgress()}%</span>
              </div>
              <Progress value={getProgress()} className="w-full" />
            </div>

            {/* Control Buttons */}
            <div className="flex space-x-3">
              {!isActive ? (
                <Button 
                  onClick={startBooking} 
                  disabled={isStarting || !subscribed}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isStarting ? 'Startar...' : 'Starta bokning'}
                </Button>
              ) : (
                <Button 
                  onClick={stopBooking}
                  variant="destructive"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stoppa bokning
                </Button>
              )}

              {session?.status === 'error' && (
                <Button 
                  onClick={startBooking}
                  variant="outline"
                  disabled={isStarting}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Försök igen
                </Button>
              )}
            </div>

            {!subscribed && (
              <Alert>
                <AlertDescription>
                  Aktivt abonnemang krävs för att starta automatisk bokning.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Display */}
      {showQRCode && (
        <QRCodeDisplay 
          qrCode={session.booking_details.qr_code}
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
