import { supabase } from '@/integrations/supabase/client';
import { VPSBookingConfig, VPSJobResponse } from './types/vpsTypes';

export class SupabaseBookingService {
  
  // Start booking through Supabase Edge Function → VPS Server
  async startBooking(config: VPSBookingConfig): Promise<VPSJobResponse> {
    console.log('[SUPABASE-BOOKING] Starting booking via Supabase Edge Function:', config);
    
    try {
      const { data, error } = await supabase.functions.invoke('start-booking', {
        body: { 
          user_id: config.user_id, 
          config 
        }
      });

      if (error) {
        console.error('[SUPABASE-BOOKING] Edge Function error:', error);
        throw new Error(error.message || 'Failed to start booking via Supabase');
      }

      console.log('[SUPABASE-BOOKING] Booking started successfully:', data);
      return data;
    } catch (error) {
      console.error('[SUPABASE-BOOKING] Error starting booking:', error);
      throw error;
    }
  }

  // Stop booking through Supabase Edge Function → VPS Server  
  async stopBooking(jobId: string): Promise<boolean> {
    console.log('[SUPABASE-BOOKING] Stopping booking via Supabase:', jobId);
    
    try {
      const { data, error } = await supabase.functions.invoke('stop-booking', {
        body: { job_id: jobId }
      });

      if (error) {
        console.error('[SUPABASE-BOOKING] Stop booking error:', error);
        throw new Error(error.message || 'Failed to stop booking');
      }

      return data?.success || false;
    } catch (error) {
      console.error('[SUPABASE-BOOKING] Error stopping booking:', error);
      throw error;
    }
  }

  // Subscribe to real-time booking updates
  setupRealtimeSubscription(
    userId: string,
    onStatusUpdate: (payload: any) => void,
    onQRCode: (qrCode: string) => void
  ) {
    console.log('[SUPABASE-BOOKING] Setting up real-time subscription for user:', userId);
    
    const subscription = supabase
      .channel(`booking-${userId}`)
      .on('broadcast', { event: 'status_update' }, (payload) => {
        console.log('[SUPABASE-BOOKING] Status update received:', payload);
        onStatusUpdate(payload);
        
        // Handle QR code updates
        if (payload.qr_code) {
          onQRCode(payload.qr_code);
        }
      })
      .subscribe();

    return subscription;
  }
}

export const supabaseBookingService = new SupabaseBookingService();
export default supabaseBookingService; 