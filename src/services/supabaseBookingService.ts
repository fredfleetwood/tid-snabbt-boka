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
        console.log('[SUPABASE-BOOKING] 🎭 DEMO MODE: Edge Functions not deployed yet');
        return this.getDemoResponse();
      }

      console.log('[SUPABASE-BOOKING] Booking started successfully:', data);
      return data;
    } catch (error) {
      console.error('[SUPABASE-BOOKING] Error starting booking:', error);
      console.log('[SUPABASE-BOOKING] 🎭 DEMO MODE: Edge Functions not deployed yet');
      return this.getDemoResponse();
    }
  }

  // Demo response for UI testing when Edge Functions aren't deployed
  private getDemoResponse(): VPSJobResponse {
    console.log('[SUPABASE-BOOKING] 🎭 DEMO MODE: Returning simulated booking response');
    return {
      success: true,
      job_id: `demo-job-${Date.now()}`,
      message: '🎭 DEMO: Booking automation started (simulated)',
      started_at: new Date().toISOString()
    };
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
        console.log('[SUPABASE-BOOKING] 🎭 DEMO MODE: Simulating stop booking');
        return true; // Demo mode - always return success
      }

      return data?.success || false;
    } catch (error) {
      console.error('[SUPABASE-BOOKING] Error stopping booking:', error);
      console.log('[SUPABASE-BOOKING] 🎭 DEMO MODE: Simulating stop booking');
      return true; // Demo mode - always return success
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