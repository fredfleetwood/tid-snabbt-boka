export interface VPSJobStatus {
  job_id: string;
  status: string;
  message?: string;
  stage?: string;
  qr_code?: string;
  qr_code_base64?: string;
  progress?: number;
  error?: string;
  timestamp?: string;
  bankid_status?: string;
  slots_found?: number;
  booking_details?: any;
}

export interface VPSWebSocketMessage {
  type: 'status_update' | 'qr_code' | 'error' | 'progress';
  data: VPSJobStatus;
}

export class VPSPollingService {
  private baseUrl = 'https://kqemgnbqjrqepzkigfcx.supabase.co/functions/v1/vps-proxy';
  private authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZW1nbmJxanJxZXB6a2lnZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTQ4MDEsImV4cCI6MjA2NDc5MDgwMX0.tnPomyWLMseJX0GlrUeO63Ig9GRZSTh1O1Fi2p9q8mc';
  private pollingInterval: NodeJS.Timeout | null = null;
  private statusPollingInterval: NodeJS.Timeout | null = null;
  private wsConnection: WebSocket | null = null;
  private onStatusUpdate?: (status: VPSJobStatus) => void;
  private onQRCode?: (qrCode: string) => void;
  private isHTTPS: boolean;
  
  // QR code deduplication
  private lastQrCode: string = '';
  private qrUpdateCount: number = 0;
  private lastQrTimestamp: number = 0;
  private isWaitingForQRReady: boolean = false;

  constructor(
    onStatusUpdate?: (status: VPSJobStatus) => void,
    onQRCode?: (qrCode: string) => void
  ) {
    this.onStatusUpdate = onStatusUpdate;
    this.onQRCode = onQRCode;
  }

  /**
   * SMART QR POLLING - Waits for backend to be ready before starting QR requests
   */
  async startSmartQRPolling(jobId: string): Promise<void> {
    console.log(`🧠 [SMART-QR] Starting intelligent QR polling for job: ${jobId}`);
    console.log(`🧠 [SMART-QR] Will wait for backend to reach QR-ready state before polling`);
    
    this.stopQRPolling(); // Stop any existing polling
    this.stopStatusPolling(); // Stop any existing status polling
    this.isWaitingForQRReady = true;
    
    // Reset QR tracking
    this.lastQrCode = '';
    this.qrUpdateCount = 0;
    this.lastQrTimestamp = 0;
    
    // First, poll status until we reach QR-ready state
    await this.waitForQRReadyState(jobId);
  }

  /**
   * Wait for backend to reach QR-ready state (qr_waiting, bankid_waiting, etc.)
   */
  private async waitForQRReadyState(jobId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait (5s intervals)
    
    const checkStatus = async () => {
      try {
        attempts++;
        const status = await this.getJobStatus(jobId);
        
        if (status) {
          console.log(`🧠 [SMART-QR] Status check #${attempts}: ${status.status}/${status.stage || 'no-stage'} - ${status.message || 'no-message'}`);
          
          // Check if we've reached QR-ready state
          const qrReadyStates = [
            'qr_waiting', 
            'bankid_waiting', 
            'waiting_bankid',
            'qr_streaming',
            'bankid'
          ];
          
          const isQRReady = qrReadyStates.includes(status.status) || 
                          qrReadyStates.includes(status.stage || '') ||
                          (status.message && status.message.toLowerCase().includes('qr'));
          
          if (isQRReady) {
            console.log(`🎯 [SMART-QR] Backend is QR-ready! Starting actual QR polling...`);
            console.log(`🎯 [SMART-QR] Ready signal: status=${status.status}, stage=${status.stage}`);
            
            this.stopStatusPolling();
            this.isWaitingForQRReady = false;
            
            // Now start actual QR polling with progressive intervals
            await this.startProgressiveQRPolling(jobId);
            return;
          }
          
          // Update UI with status
          this.onStatusUpdate?.(status);
          
          // Check if job failed or completed
          if (status.status === 'error' || status.status === 'failed' || status.status === 'completed') {
            console.log(`❌ [SMART-QR] Job ended before QR phase: ${status.status}`);
            this.stopStatusPolling();
            this.isWaitingForQRReady = false;
            return;
          }
        } else {
          console.log(`⚠️ [SMART-QR] Status check #${attempts}: No response from backend`);
        }
        
        if (attempts >= maxAttempts) {
          console.log(`⏰ [SMART-QR] Timeout waiting for QR-ready state after ${maxAttempts} attempts`);
          console.log(`🔄 [SMART-QR] Starting QR polling anyway as fallback...`);
          
          this.stopStatusPolling();
          this.isWaitingForQRReady = false;
          await this.startProgressiveQRPolling(jobId);
        }
      } catch (error) {
        console.error(`❌ [SMART-QR] Status check error:`, error);
      }
    };

    // Start status polling with 5-second intervals
    console.log(`🕐 [SMART-QR] Starting status polling (5s intervals) to wait for QR-ready state...`);
    await checkStatus(); // Check immediately
    this.statusPollingInterval = setInterval(checkStatus, 5000);
  }

  /**
   * Progressive QR polling - starts slow, speeds up when QR detected
   */
  private async startProgressiveQRPolling(jobId: string): Promise<void> {
    console.log(`📈 [PROGRESSIVE-QR] Starting progressive QR polling for job: ${jobId}`);
    
    let currentInterval = 5000; // Start with 5 second intervals
    let hasSeenQR = false;
    
    const pollQRCode = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${this.baseUrl}?job_id=${jobId}&action=qr&_t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'apikey': this.authToken,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          
          // Check for QR code in response
          if (data.qr_code || data.qr_code_base64 || data.image_data) {
            const qrCode = data.image_data || data.qr_code_base64 || data.qr_code;
            const currentTime = Date.now();
            
            // First QR detected - switch to fast polling!
            if (!hasSeenQR) {
              hasSeenQR = true;
              console.log(`🚀 [PROGRESSIVE-QR] FIRST QR DETECTED! Switching to fast 1-second polling...`);
              
              // Stop current interval and restart with 1-second intervals
              this.stopQRPolling();
              await this.startQRPolling(jobId, 1000);
              return; // Exit this progressive polling
            }
            
            // QR DEDUPLICATION - only send if different from last QR
            if (qrCode !== this.lastQrCode) {
              this.qrUpdateCount++;
              const timeSinceLastQr = this.lastQrTimestamp > 0 ? currentTime - this.lastQrTimestamp : 0;
              
              console.log(`🆕 [QR-UPDATE #${this.qrUpdateCount}] NEW QR detected!`);
              console.log(`📊 [QR-TIMING] Response time: ${responseTime}ms, Gap since last QR: ${timeSinceLastQr}ms`);
              
              this.lastQrCode = qrCode;
              this.lastQrTimestamp = currentTime;
              this.onQRCode?.(qrCode);
            }
          } else {
            // No QR yet - this is expected early on
            if (data.qr_status === 'expired_or_pending') {
              console.log(`⏰ [PROGRESSIVE-QR] QR expired/pending (${responseTime}ms) - waiting for renewal (${currentInterval}ms intervals)`);
            } else {
              console.log(`⏳ [PROGRESSIVE-QR] No QR yet (${responseTime}ms) - backend preparing... (${currentInterval}ms intervals)`);
            }
          }

          // Update status if provided
          if (data.status || data.stage) {
            this.onStatusUpdate?.(data);
          }
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ [PROGRESSIVE-QR] Polling failed: ${response.status} (${responseTime}ms) - ${errorText}`);
        }
      } catch (error) {
        console.error('❌ [PROGRESSIVE-QR] Polling error:', error);
      }
    };

    // Start with slower polling, will accelerate when first QR is found
    console.log(`📈 [PROGRESSIVE-QR] Starting with ${currentInterval}ms intervals until first QR detected`);
    await pollQRCode();
    this.pollingInterval = setInterval(pollQRCode, currentInterval);
  }

  /**
   * Original QR polling method (for when we know QR is ready)
   */
  async startQRPolling(jobId: string, intervalMs: number = 1000): Promise<void> {
    console.log(`🔍 [QR-POLLING] Starting FAST polling for job: ${jobId} (interval: ${intervalMs}ms)`);
    
    this.stopQRPolling(); // Stop any existing polling
    
    // Reset QR tracking if this is a fresh start
    if (!this.isWaitingForQRReady) {
      this.lastQrCode = '';
      this.qrUpdateCount = 0;
      this.lastQrTimestamp = 0;
    }
    
    const pollQRCode = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${this.baseUrl}?job_id=${jobId}&action=qr&_t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'apikey': this.authToken,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          
          // Check for QR code in response
          if (data.qr_code || data.qr_code_base64 || data.image_data) {
            const qrCode = data.image_data || data.qr_code_base64 || data.qr_code;
            const currentTime = Date.now();
            
            // QR DEDUPLICATION - only send if different from last QR
            if (qrCode !== this.lastQrCode) {
              this.qrUpdateCount++;
              const timeSinceLastQr = this.lastQrTimestamp > 0 ? currentTime - this.lastQrTimestamp : 0;
              
              console.log(`🆕 [QR-UPDATE #${this.qrUpdateCount}] NEW QR detected!`);
              console.log(`📊 [QR-TIMING] Response time: ${responseTime}ms, Gap since last QR: ${timeSinceLastQr}ms`);
              console.log(`📱 [QR-DATA] Length: ${qrCode.length}, Preview: ${qrCode.substring(0, 50)}...`);
              
              this.lastQrCode = qrCode;
              this.lastQrTimestamp = currentTime;
              this.onQRCode?.(qrCode);
            } else {
              // Same QR code - log but don't send
              console.log(`🔄 [QR-SAME] Identical QR received (${responseTime}ms response time)`);
            }
          } else {
            // Check if QR expired or just pending
            if (data.qr_status === 'expired_or_pending') {
              console.log(`⏰ [QR-EXPIRED] QR code expired or pending (${responseTime}ms) - waiting for renewal`);
            } else {
              console.log(`⭕ [QR-EMPTY] No QR in response (${responseTime}ms)`);
            }
          }

          // Update status if provided
          if (data.status || data.stage) {
            this.onStatusUpdate?.(data);
          }
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ [QR-ERROR] Polling failed: ${response.status} (${responseTime}ms) - ${errorText}`);
        }
      } catch (error) {
        console.error('❌ [QR-EXCEPTION] Polling error:', error);
      }
    };

    // Poll immediately, then on consistent interval
    console.log(`⚡ [QR-POLLING] Using CONSISTENT ${intervalMs}ms interval`);
    await pollQRCode();
    this.pollingInterval = setInterval(pollQRCode, intervalMs);
  }

  /**
   * Stop QR polling
   */
  stopQRPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log(`⏹️ [QR-POLLING] Stopped. Total QR updates received: ${this.qrUpdateCount}`);
    }
  }

  /**
   * Stop status polling
   */
  private stopStatusPolling(): void {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
      console.log(`⏹️ [STATUS-POLLING] Stopped`);
    }
  }

  /**
   * Connect to WebSocket for live updates (DISABLED for HTTPS compatibility)
   */
  connectWebSocket(jobId: string): void {
    console.log(`🌐 WebSocket disabled for HTTPS compatibility. Using polling for job: ${jobId}`);
    
    this.disconnectWebSocket();
    
    // WebSocket disabled due to HTTPS mixed content restrictions
    // QR polling will handle all updates
    return;
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close(1000, 'Manual disconnect');
      this.wsConnection = null;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Get current job status
   */
  async getJobStatus(jobId: string): Promise<VPSJobStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}?job_id=${jobId}&action=status`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'apikey': this.authToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const status = await response.json();
        return status;
      } else {
        console.warn('⚠️ Status fetch failed:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Status fetch error:', error);
      return null;
    }
  }

  /**
   * Get QR polling statistics
   */
  getQRStats() {
    return {
      updateCount: this.qrUpdateCount,
      lastUpdate: this.lastQrTimestamp,
      lastQrLength: this.lastQrCode.length
    };
  }

  /**
   * Cleanup all connections and polling
   */
  cleanup(): void {
    this.stopQRPolling();
    this.stopStatusPolling();
    this.disconnectWebSocket();
    this.isWaitingForQRReady = false;
    console.log('🧹 VPS polling service cleaned up');
  }

  /**
   * Refresh QR code once (for manual refresh buttons)
   */
  async refreshQRCode(jobId: string): Promise<string | null> {
    console.log(`🔄 [QR-REFRESH] Manual refresh for job: ${jobId}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}?job_id=${jobId}&action=qr&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'apikey': this.authToken,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        // Check for QR code in response
        if (data.qr_code || data.qr_code_base64 || data.image_data) {
          const qrCode = data.image_data || data.qr_code_base64 || data.qr_code;
          console.log(`✅ [QR-REFRESH] Found QR code (${responseTime}ms)`);
          
          // Update tracking and send to callback
          this.lastQrCode = qrCode;
          this.lastQrTimestamp = Date.now();
          this.onQRCode?.(qrCode);
          
          return qrCode;
        } else {
          console.log(`⭕ [QR-REFRESH] No QR code available (${responseTime}ms)`);
          return null;
        }
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ [QR-REFRESH] Failed: ${response.status} (${responseTime}ms) - ${errorText}`);
        return null;
      }
    } catch (error) {
      console.error('❌ [QR-REFRESH] Error:', error);
      return null;
    }
  }
}

// Singleton instance for easy use
export const vpsPolling = new VPSPollingService(); 