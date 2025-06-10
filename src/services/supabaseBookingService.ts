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
        
        // FALLBACK: Call VPS directly if Edge Functions not deployed
        console.log('[SUPABASE-BOOKING] Falling back to direct VPS call...');
        return await this.startBookingDirectVPS(config);
      }

      console.log('[SUPABASE-BOOKING] Booking started successfully:', data);
      return data;
    } catch (error) {
      console.error('[SUPABASE-BOOKING] Error starting booking, trying VPS directly:', error);
      return await this.startBookingDirectVPS(config);
    }
  }

  // TEMPORARY: Direct VPS call (fallback)
  private async startBookingDirectVPS(config: VPSBookingConfig): Promise<VPSJobResponse> {
    console.log('[SUPABASE-BOOKING] Calling VPS directly:', config);
    
    const vpsConfig = {
      user_id: config.user_id,
      license_type: config.license_type,
      exam_type: config.exam,
      vehicle_language: config.vehicle_language,
      locations: config.locations,
      date_ranges: config.date_ranges,
      personnummer: config.personnummer
    };

    const response = await fetch('http://87.106.247.92:8080/api/v1/booking/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-secret-token-12345'
      },
      body: JSON.stringify(vpsConfig)
    });

    if (!response.ok) {
      throw new Error(`VPS Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[SUPABASE-BOOKING] Direct VPS call successful:', result);
    return result;
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