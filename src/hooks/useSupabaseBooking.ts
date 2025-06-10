import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseBookingService } from '@/services/supabaseBookingService';
import { VPSBookingConfig } from '@/services/types/vpsTypes';
import { useToast } from '@/components/ui/use-toast';

interface BookingState {
  jobId: string | null;
  status: string;
  message: string;
  progress: number;
  qrCode: string | null;
  isActive: boolean;
  loading: boolean;
  error: string | null;
}

export const useSupabaseBooking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bookingState, setBookingState] = useState<BookingState>({
    jobId: null,
    status: 'idle',
    message: '',
    progress: 0,
    qrCode: null,
    isActive: false,
    loading: false,
    error: null
  });

  // Start booking through Supabase → VPS integration
  const startBooking = useCallback(async (config: VPSBookingConfig) => {
    if (!user) {
      toast({
        title: "Autentisering krävs",
        description: "Du måste vara inloggad för att starta bokning",
        variant: "destructive"
      });
      return null;
    }

    setBookingState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const bookingConfig = {
        ...config,
        user_id: user.id
      };

      const result = await supabaseBookingService.startBooking(bookingConfig);
      
      setBookingState(prev => ({
        ...prev,
        jobId: result.job_id,
        status: 'starting',
        message: 'Bokning startad via Supabase',
        isActive: true,
        loading: false
      }));

      toast({
        title: "Bokning startad!",
        description: `Job ID: ${result.job_id}`,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
      
      setBookingState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isActive: false
      }));

      toast({
        title: "Fel vid start av bokning",
        description: errorMessage,
        variant: "destructive"
      });

      return null;
    }
  }, [user, toast]);

  // Stop booking
  const stopBooking = useCallback(async () => {
    if (!bookingState.jobId) return false;

    setBookingState(prev => ({ ...prev, loading: true }));

    try {
      const success = await supabaseBookingService.stopBooking(bookingState.jobId);
      
      if (success) {
        setBookingState(prev => ({
          ...prev,
          status: 'cancelled',
          message: 'Bokning stoppad av användare',
          isActive: false,
          loading: false
        }));

        toast({
          title: "Bokning stoppad",
          description: "Automatisk bokning har stoppats",
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fel vid stopp av bokning';
      
      setBookingState(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      toast({
        title: "Fel vid stopp av bokning",
        description: errorMessage,
        variant: "destructive"
      });

      return false;
    }
  }, [bookingState.jobId, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !bookingState.isActive) return;

    const subscription = supabaseBookingService.setupRealtimeSubscription(
      user.id,
      // Handle status updates
      (payload) => {
        setBookingState(prev => ({
          ...prev,
          status: payload.status || prev.status,
          message: payload.message || prev.message,
          progress: payload.progress || prev.progress,
          isActive: !['completed', 'failed', 'cancelled'].includes(payload.status)
        }));

        // Show toast for important status changes
        if (payload.status === 'completed') {
          toast({
            title: "Bokning genomförd!",
            description: "Din körprovstid har bokats framgångsrikt",
          });
        } else if (payload.status === 'failed') {
          toast({
            title: "Bokning misslyckades",
            description: payload.message || "Ett fel uppstod under bokningsprocessen",
            variant: "destructive"
          });
        }
      },
      // Handle QR code updates
      (qrCode) => {
        setBookingState(prev => ({ ...prev, qrCode }));
        
        toast({
          title: "Ny QR-kod",
          description: "Scanna QR-koden med din BankID-app",
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user, bookingState.isActive, toast]);

  return {
    bookingState,
    startBooking,
    stopBooking,
    // Convenience getters
    isActive: bookingState.isActive,
    isLoading: bookingState.loading,
    qrCode: bookingState.qrCode,
    status: bookingState.status,
    progress: bookingState.progress,
    message: bookingState.message,
    error: bookingState.error
  };
}; 