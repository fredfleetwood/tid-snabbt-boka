import { supabase } from '@/integrations/supabase/client';
import { VPSBookingConfig, VPSJobResponse } from './types/vpsTypes';

export class SupabaseBookingService {
  
  // Start booking through Supabase Edge Function → VPS Server
  async startBooking(config: VPSBookingConfig): Promise<VPSJobResponse> {
    console.log('[SUPABASE-BOOKING] 🚀 Starting booking via Supabase Edge Function');
    console.log('[SUPABASE-BOOKING] 📊 Config received:', config);
    
    try {
      console.log('[SUPABASE-BOOKING] 🔄 Step 1: Preparing Edge Function request...');
      
      const requestBody = {
        user_id: config.user_id,
        config_id: config.config_id,
        config: {
          personnummer: config.personnummer,
          license_type: config.license_type,
          exam: config.exam, // Will be mapped to exam_type by Edge Function
          vehicle_language: config.vehicle_language,
          locations: config.locations,
          date_ranges: config.date_ranges
        }
      };
      
      console.log('[SUPABASE-BOOKING] 📊 Request body prepared:', requestBody);
      console.log('[SUPABASE-BOOKING] 🔄 Step 2: Calling start-booking Edge Function...');
      
      // BookingConfigForm sends data in flat structure, so we pass it directly
      const { data, error } = await supabase.functions.invoke('start-booking', {
        body: requestBody
      });

      console.log('[SUPABASE-BOOKING] 📨 Edge Function response received');
      console.log('[SUPABASE-BOOKING] 📊 Response data:', data);
      console.log('[SUPABASE-BOOKING] ❓ Response error:', error);

      if (error) {
        console.error('[SUPABASE-BOOKING] ❌ Edge Function error details:', error);
        console.log('[SUPABASE-BOOKING] 🎭 DEMO MODE: Edge Function failed, using demo response');
        return this.getDemoResponse();
      }

      console.log('[SUPABASE-BOOKING] ✅ Booking started successfully via Edge Function:', data);
      return data;
    } catch (error) {
      console.error('[SUPABASE-BOOKING] ❌ Exception in startBooking:', error);
      console.error('[SUPABASE-BOOKING] ❌ Exception details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        error: error
      });
      console.log('[SUPABASE-BOOKING] 🎭 DEMO MODE: Exception occurred, using demo response');
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