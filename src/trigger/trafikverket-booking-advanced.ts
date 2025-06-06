import { task } from "@trigger.dev/sdk/v3";
import { chromium, Browser, Page } from "playwright";

interface BookingPayload {
  user_id: string;
  session_id: string;
  config: {
    personnummer?: string;
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
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const updateSessionStatus = async (status: string, details: any) => {
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

    let browser: Browser | null = null;
    let page: Page | null = null;
    let cycleCount = 0;
    let slotsFound = 0;

    try {
      // Update status: Starting browser
      await updateSessionStatus('browser_starting', {
        stage: 'browser_starting',
        message: '🌍 Startar webbläsare (WebKit)...',
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'browser_initialization'
      });

      // Launch browser with advanced settings
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      });

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
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Accept cookies
      try {
        const cookieButton = page.locator('button:has-text("Acceptera alla")');
        if (await cookieButton.isVisible({ timeout: 5000 })) {
          await cookieButton.click();
          await updateSessionStatus('cookies_accepted', {
            stage: 'cookies_accepted',
            message: '🍪 Accepterade cookies',
            timestamp: new Date().toISOString(),
            cycle_count: cycleCount,
            slots_found: slotsFound,
            current_operation: 'cookie_acceptance'
          });
        }
      } catch (error) {
        console.log('No cookie banner found or already accepted');
      }

      // Navigate to booking page
      await page.goto('https://fp.trafikverket.se/boka/', { 
        waitUntil: 'networkidle',
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
      const loginButton = page.locator('a[href*="login"]').first();
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      // Look for BankID option and click it directly
      const bankidButton = page.locator('button:has-text("BankID"), input[value*="BankID"], a:has-text("BankID")');
      await bankidButton.click();
      await page.waitForLoadState('networkidle');

      // Update status: Waiting for BankID with QR code streaming
      await updateSessionStatus('bankid_waiting', {
        stage: 'bankid_waiting',
        message: '📱 Skanna QR-koden med BankID-appen',
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'bankid_authentication'
      });

      // QR Code streaming loop
      let qrStreamCount = 0;
      const maxQrUpdates = 60; // Max 2 minutes of QR streaming (2 seconds interval)
      
      while (qrStreamCount < maxQrUpdates) {
        try {
          // Look for QR code in various possible selectors
          const qrSelectors = [
            'img[alt*="QR"]',
            'img[alt*="qr"]', 
            'img[src*="qr"]',
            'img[src*="QR"]',
            'canvas',
            '.qr-code img',
            '[data-testid="qr-code"]',
            '.bankid-qr img'
          ];
          
          let qrCodeSrc = null;
          for (const selector of qrSelectors) {
            const qrElement = page.locator(selector).first();
            if (await qrElement.isVisible({ timeout: 1000 })) {
              qrCodeSrc = await qrElement.getAttribute('src');
              if (qrCodeSrc) break;
            }
          }

          // If we found a QR code, stream it
          if (qrCodeSrc) {
            await updateSessionStatus('bankid_waiting', {
              stage: 'bankid_waiting', 
              message: `📱 Skanna QR-koden med BankID-appen (${qrStreamCount + 1}/${maxQrUpdates})`,
              timestamp: new Date().toISOString(),
              cycle_count: cycleCount,
              slots_found: slotsFound,
              current_operation: 'bankid_qr_streaming',
              qr_code: qrCodeSrc
            });
          }

          // Check if login was successful (redirect to booking page)
          if (page.url().includes('/boka/') && !page.url().includes('login')) {
            await updateSessionStatus('login_success', {
              stage: 'login_success',
              message: '✅ BankID-inloggning lyckades!',
              timestamp: new Date().toISOString(),
              cycle_count: cycleCount,
              slots_found: slotsFound,
              current_operation: 'login_completed'
            });
            break;
          }

          // Check for login error
          const errorElement = page.locator(':has-text("fel"), :has-text("error"), .error, .alert-danger');
          if (await errorElement.isVisible({ timeout: 1000 })) {
            throw new Error('BankID authentication failed');
          }

          qrStreamCount++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Update every 2 seconds
          
        } catch (qrError) {
          console.log('QR streaming error:', qrError);
          break;
        }
      }

      // If we exited the loop without successful login, it's a timeout
      if (!page.url().includes('/boka/') || page.url().includes('login')) {
        throw new Error('BankID authentication timeout - QR code not scanned within time limit');
      }

      // Configure exam type and locations
      await updateSessionStatus('selecting_locations', {
        stage: 'selecting_locations',
        message: '📍 Väljer provplatser...',
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'location_selection'
      });

      // Main booking loop
      const startTime = Date.now();
      const maxRunTime = automation_settings.timeout;

      while (Date.now() - startTime < maxRunTime && cycleCount < automation_settings.max_cycles) {
        cycleCount++;

        await updateSessionStatus('searching', {
          stage: 'searching',
          message: `🔄 Sökning ${cycleCount}/${automation_settings.max_cycles}...`,
          timestamp: new Date().toISOString(),
          cycle_count: cycleCount,
          slots_found: slotsFound,
          current_operation: 'slot_searching'
        });

        try {
          // Search for available times
          const searchButton = page.locator('button:has-text("Sök"), input[type="submit"][value*="Sök"]');
          if (await searchButton.isVisible({ timeout: 5000 })) {
            await searchButton.click();
            await page.waitForLoadState('networkidle', { timeout: 10000 });
          }

          // Check for available slots
          const availableSlots = page.locator('.available-time, .time-slot.available, [data-available="true"]');
          const slotCount = await availableSlots.count();
          
          if (slotCount > 0) {
            slotsFound = slotCount;
            
            await updateSessionStatus('times_found', {
              stage: 'times_found',
              message: `📅 Hittade ${slotsFound} lediga tider!`,
              timestamp: new Date().toISOString(),
              cycle_count: cycleCount,
              slots_found: slotsFound,
              current_operation: 'available_slots_found'
            });

            // Try to book the first available slot
            await updateSessionStatus('booking_time', {
              stage: 'booking_time',
              message: '⏰ Bokar vald tid...',
              timestamp: new Date().toISOString(),
              cycle_count: cycleCount,
              slots_found: slotsFound,
              current_operation: 'booking_attempt'
            });

            await availableSlots.first().click();
            
            // Look for confirmation button
            const confirmButton = page.locator('button:has-text("Bekräfta"), button:has-text("Boka"), input[type="submit"][value*="Bekräfta"]');
            if (await confirmButton.isVisible({ timeout: 5000 })) {
              await confirmButton.click();
              
              // Check for successful booking
              const successMessage = page.locator(':has-text("bokad"), :has-text("bekräftelse"), .success, .confirmation');
              if (await successMessage.isVisible({ timeout: 10000 })) {
                await updateSessionStatus('booking_complete', {
                  stage: 'booking_complete',
                  message: '🎉 Bokning genomförd!',
                  timestamp: new Date().toISOString(),
                  cycle_count: cycleCount,
                  slots_found: slotsFound,
                  current_operation: 'booking_completed'
                });

                await updateSessionStatus('completed', {
                  stage: 'completed',
                  message: '🎉 Automatisering klar! Provtid bokad.',
                  timestamp: new Date().toISOString(),
                  cycle_count: cycleCount,
                  slots_found: slotsFound,
                  current_operation: 'automation_completed'
                });

                return { success: true, message: 'Booking completed successfully', cycles: cycleCount };
              }
            }
          }

          // Wait before next cycle
          if (cycleCount % automation_settings.refresh_interval === 0) {
            await page.reload({ waitUntil: 'networkidle' });
          }
          
          await new Promise(resolve => setTimeout(resolve, automation_settings.cycle_delay));

        } catch (cycleError) {
          console.error(`Error in cycle ${cycleCount}:`, cycleError);
          
          // Try to recover
          try {
            await page.reload({ waitUntil: 'networkidle' });
          } catch (reloadError) {
            console.error('Failed to reload page:', reloadError);
          }
        }
      }

      // Automation completed without finding slots
      await updateSessionStatus('completed', {
        stage: 'completed',
        message: `⏰ Automatisering klar efter ${cycleCount} försök. Inga lediga tider hittades.`,
        timestamp: new Date().toISOString(),
        cycle_count: cycleCount,
        slots_found: slotsFound,
        current_operation: 'automation_timeout'
      });

      return { success: false, message: 'No available slots found', cycles: cycleCount };

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
