import { task } from "@trigger.dev/sdk/v3";
import puppeteer from "puppeteer-core";

interface BookingPayload {
  user_id: string;
  session_id: string;
  config: {
    personnummer?: string; // Optional since we use QR code now
    license_type: string;
    exam: string;
    vehicle_language: string[];
    date_ranges: Array<{ from: string; to: string }>;
    locations: string[];
  };
  automation_settings: {
    max_cycles: number;
    cycle_delay: number;
    refresh_interval: number;
    timeout: number;
    retry_attempts: number;
  };
}

export const trafikverketBookingAdvanced = task({
  id: "trafikverket-booking-advanced",
  run: async (payload: BookingPayload) => {
    const { user_id, session_id, config, automation_settings } = payload;
    
    console.log(`Starting advanced booking automation for session ${session_id}`);
    
    // Initialize Supabase client for status updates
    const supabaseUrl = process.env.DATABASE_URL;
    const supabaseKey = process.env.DATABASE_SERVICE_KEY;
    
    // Mock mode if Supabase is not configured
    const mockMode = !supabaseUrl || !supabaseKey;
    
    if (mockMode) {
      console.log('⚠️ Running in MOCK MODE - Supabase not configured');
    }

    const updateSessionStatus = async (status: string, details: any) => {
      if (mockMode) {
        console.log(`[MOCK] Status: ${status}`, details);
        return;
      }
      
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/booking_sessions?id=eq.${session_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            status,
            booking_details: details,
            updated_at: new Date().toISOString(),
          }),
        });
        
        if (!response.ok) {
          console.error('Failed to update session status:', await response.text());
        }
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    };

    let browser = null;
    let page = null;
    let cycleCount = 0;
    let slotsFound = 0;

    try {
      // Update status: Starting browser
      await updateSessionStatus('browser_starting', {
        stage: 'browser_starting',
        message: '🌍 Startar webbläsare (Chromium)...',
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'browser_initialization'
      });

      // Launch browser with Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu'
        ]
      });

      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

      // Update status: Navigating
      await updateSessionStatus('navigating', {
        stage: 'navigating',
        message: '🌐 Navigerar till Trafikverket...',
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'navigation'
      });

      // Navigate to Trafikverket
      await page.goto('https://www.trafikverket.se/korkort/', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Accept cookies
      try {
        await page.waitForSelector('button:contains("Acceptera alla")', { timeout: 5000 });
        await page.click('button:contains("Acceptera alla")');
        await updateSessionStatus('cookies_accepted', {
          stage: 'cookies_accepted',
          message: '🍪 Accepterade cookies',
          timestamp: new Date().toISOString(),
          cycle_count: cycleCount,
          slots_found: slotsFound,
          current_operation: 'cookie_acceptance'
        });
      } catch (error) {
        console.log('No cookie banner found or already accepted');
      }

      // Navigate to booking page
      await page.goto('https://fp.trafikverket.se/boka/', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Update status: Starting login
      await updateSessionStatus('logging_in', {
        stage: 'logging_in',
        message: '🔐 Startar inloggning...',
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'login_initiation'
      });

      // Click login button
      await page.waitForSelector('a[href*="login"]');
      await page.click('a[href*="login"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      // Look for BankID option and click it directly
      await page.waitForSelector('button:contains("BankID"), input[value*="BankID"], a:contains("BankID")');
      await page.click('button:contains("BankID"), input[value*="BankID"], a:contains("BankID")');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      // QR Code streaming and completion mock
      await updateSessionStatus('bankid_waiting', {
        stage: 'bankid_waiting',
        message: '📱 Skanna QR-koden med BankID-appen',
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'bankid_qr_streaming',
        qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      });

      await updateSessionStatus('completed', {
        stage: 'completed',
        message: '🧪 Puppeteer-test slutförd! Deploy fungerar.',
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'puppeteer_test_completed'
      });

      return { success: true, message: 'Puppeteer test completed successfully', cycles: cycleCount };

    } catch (error) {
      console.error('Booking automation error:', error);
      
      await updateSessionStatus('error', {
        stage: 'error',
        message: `❌ Fel uppstod: ${error.message}`,
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'error_handling'
      });

      throw error;
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  },
});
