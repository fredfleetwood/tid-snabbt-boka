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
  private qrStorageUrl = 'https://kqemgnbqjrqepzkigfcx.supabase.co/functions/v1/qr-storage';
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
   * ULTRA-FAST SMART QR POLLING - Optimized for backend's 2-second QR updates
   */
  async startSmartQRPolling(jobId: string): Promise<void> {
    console.log(`🧠 [ULTRA-SMART-QR] Starting ultra-responsive QR polling for job: ${jobId}`);
    console.log(`🧠 [ULTRA-SMART-QR] Optimized for backend's 2-second QR update frequency`);
    
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
   * Wait for backend to reach QR-ready state with faster polling
   */
  private async waitForQRReadyState(jobId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 40; // 2 minutes max wait (3s intervals)
    
    const checkStatus = async () => {
      try {
        attempts++;
        const status = await this.getJobStatus(jobId);
        
        if (status) {
          console.log(`🧠 [ULTRA-SMART-QR] Status check #${attempts}: ${status.status}/${status.stage || 'no-stage'} - ${status.message || 'no-message'}`);
          
          // Enhanced QR-ready state detection
          const qrReadyStates = [
            'qr_waiting', 
            'bankid_waiting', 
            'waiting_bankid',
            'qr_streaming',
            'bankid',
            'authenticating',
            'authentication'
          ];
          
          const isQRReady = qrReadyStates.includes(status.status) || 
                          qrReadyStates.includes(status.stage || '') ||
                          (status.message && status.message.toLowerCase().includes('qr')) ||
                          (status.message && status.message.toLowerCase().includes('bankid'));
          
          if (isQRReady) {
            console.log(`🎯 [ULTRA-SMART-QR] Backend is QR-ready! Starting ultra-fast QR polling...`);
            console.log(`🎯 [ULTRA-SMART-QR] Ready signal: status=${status.status}, stage=${status.stage}`);
            
            this.stopStatusPolling();
            this.isWaitingForQRReady = false;
            
            // Start ultra-fast QR polling with 1-second intervals
            await this.startUltraFastQRPolling(jobId);
            return;
          }
          
          // Update UI with status
          this.onStatusUpdate?.(status);
          
          // Check if job failed or completed
          if (status.status === 'error' || status.status === 'failed' || status.status === 'completed') {
            console.log(`❌ [ULTRA-SMART-QR] Job ended before QR phase: ${status.status}`);
            this.stopStatusPolling();
            this.isWaitingForQRReady = false;
            return;
          }
        } else {
          console.log(`⚠️ [ULTRA-SMART-QR] Status check #${attempts}: No response from backend`);
        }
        
        if (attempts >= maxAttempts) {
          console.log(`⏰ [ULTRA-SMART-QR] Timeout waiting for QR-ready state after ${maxAttempts} attempts`);
          console.log(`🔄 [ULTRA-SMART-QR] Starting QR polling anyway as fallback...`);
          
          this.stopStatusPolling();
          this.isWaitingForQRReady = false;
          await this.startUltraFastQRPolling(jobId);
        }
      } catch (error) {
        console.error(`❌ [ULTRA-SMART-QR] Status check error:`, error);
      }
    };

    // Start status polling with 3-second intervals (faster than before)
    console.log(`🕐 [ULTRA-SMART-QR] Starting status polling (3s intervals) to wait for QR-ready state...`);
    await checkStatus(); // Check immediately
    this.statusPollingInterval = setInterval(checkStatus, 3000);
  }

  /**
   * Ultra-fast QR polling - 1-second intervals to catch backend's 2-second updates
   */
  private async startUltraFastQRPolling(jobId: string): Promise<void> {
    console.log(`⚡ [ULTRA-FAST-QR] Starting ultra-fast QR polling for job: ${jobId}`);
    console.log(`⚡ [ULTRA-FAST-QR] Using 1-second intervals to catch 2-second backend updates`);
    
    let qrDetectionAttempts = 0;
    let hasSeenFirstQR = false;
    
    const pollQRCode = async () => {
      try {
        qrDetectionAttempts++;
        const startTime = Date.now();
        const response = await fetch(`${this.qrStorageUrl}?job_id=${jobId}&_t=${Date.now()}`, {
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
          
          // Check for QR code URL in response
          if (data.qr_url && data.success) {
            const qrCode = data.qr_url;
            const currentTime = Date.now();
            
            // First QR detected - celebrate!
            if (!hasSeenFirstQR) {
              hasSeenFirstQR = true;
              console.log(`🎉 [ULTRA-FAST-QR] FIRST QR DETECTED after ${qrDetectionAttempts} attempts!`);
              console.log(`🎉 [ULTRA-FAST-QR] QR system is now live and responsive!`);
            }
            
            // Enhanced QR deduplication with hash comparison
            if (qrCode !== this.lastQrCode) {
              this.qrUpdateCount++;
              const timeSinceLastQr = this.lastQrTimestamp > 0 ? currentTime - this.lastQrTimestamp : 0;
              
              console.log(`⚡ [QR-UPDATE #${this.qrUpdateCount}] NEW QR detected!`);
              console.log(`📊 [QR-METRICS] Response: ${responseTime}ms, Gap: ${timeSinceLastQr}ms, Attempts: ${qrDetectionAttempts}`);
              
              // Check if this follows the expected ~2 second pattern
              if (timeSinceLastQr > 0) {
                const updatePattern = timeSinceLastQr / 1000;
                console.log(`🔄 [QR-PATTERN] Update frequency: ${updatePattern.toFixed(1)}s (expect ~2.0s)`);
              }
              
              this.lastQrCode = qrCode;
              this.lastQrTimestamp = currentTime;
              this.onQRCode?.(qrCode);
              
              // Reset detection attempts after successful QR
              qrDetectionAttempts = 0;
            } else {
              // Same QR code - still good, shows system is stable
              console.log(`🔄 [QR-STABLE] Same QR (${responseTime}ms) - backend stable`);
            }
          } else {
            // No QR yet - count attempts
            if (data.error && data.error.includes('not found')) {
              console.log(`⏳ [ULTRA-FAST-QR] QR not ready (${responseTime}ms) - attempt ${qrDetectionAttempts}`);
            } else {
              console.log(`⏳ [ULTRA-FAST-QR] No QR URL yet (${responseTime}ms) - backend preparing...`);
            }
          }

          // Update status if provided
          if (data.status || data.stage) {
            this.onStatusUpdate?.(data);
          }
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ [ULTRA-FAST-QR] Polling failed: ${response.status} (${responseTime}ms) - ${errorText}`);
        }
      } catch (error) {
        console.error('❌ [ULTRA-FAST-QR] Polling error:', error);
      }
    };

    // Start ultra-fast polling with 1-second intervals
    console.log(`⚡ [ULTRA-FAST-QR] Starting consistent 1000ms intervals`);
    await pollQRCode();
    this.pollingInterval = setInterval(pollQRCode, 1000);
  }

  /**
   * Progressive QR polling - LEGACY method, replaced by ultra-fast polling
   */
  private async startProgressiveQRPolling(jobId: string): Promise<void> {
    console.log(`📈 [PROGRESSIVE-QR] LEGACY: Redirecting to ultra-fast polling...`);
    await this.startUltraFastQRPolling(jobId);
  }

  /**
   * Enhanced QR polling method - optimized for 2-second backend updates
   */
  async startQRPolling(jobId: string, intervalMs: number = 1000): Promise<void> {
    console.log(`🔍 [QR-POLLING] Starting enhanced QR polling for job: ${jobId} (interval: ${intervalMs}ms)`);
    console.log(`🔍 [QR-POLLING] Optimized for backend's 2-second QR update frequency`);
    
    this.stopQRPolling(); // Stop any existing polling
    
    // Reset QR tracking if this is a fresh start
    if (!this.isWaitingForQRReady) {
      this.lastQrCode = '';
      this.qrUpdateCount = 0;
      this.lastQrTimestamp = 0;
    }
    
    let consecutiveFailures = 0;
    let totalAttempts = 0;
    
    const pollQRCode = async () => {
      try {
        totalAttempts++;
        const startTime = Date.now();
        const response = await fetch(`${this.qrStorageUrl}?job_id=${jobId}&_t=${Date.now()}`, {
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
          consecutiveFailures = 0; // Reset failure count
          const data = await response.json();
          
          // Check for QR code URL in response
          if (data.qr_url && data.success) {
            const qrCode = data.qr_url;
            const currentTime = Date.now();
            
            // Enhanced QR deduplication with timing analysis
            if (qrCode !== this.lastQrCode) {
              this.qrUpdateCount++;
              const timeSinceLastQr = this.lastQrTimestamp > 0 ? currentTime - this.lastQrTimestamp : 0;
              
              console.log(`⭐ [QR-UPDATE #${this.qrUpdateCount}] NEW QR detected!`);
              console.log(`📊 [QR-METRICS] Response: ${responseTime}ms, Gap: ${timeSinceLastQr}ms, Total attempts: ${totalAttempts}`);
              
              // Analyze update pattern
              if (timeSinceLastQr > 0) {
                const updateFrequency = timeSinceLastQr / 1000;
                const expectedFrequency = 2.0; // Backend updates every 2 seconds
                const variance = Math.abs(updateFrequency - expectedFrequency);
                
                if (variance < 0.5) {
                  console.log(`✅ [QR-TIMING] Perfect timing: ${updateFrequency.toFixed(1)}s (expected ${expectedFrequency}s)`);
                } else {
                  console.log(`⚠️ [QR-TIMING] Timing variance: ${updateFrequency.toFixed(1)}s (expected ${expectedFrequency}s, variance: ${variance.toFixed(1)}s)`);
                }
              }
              
              this.lastQrCode = qrCode;
              this.lastQrTimestamp = currentTime;
              this.onQRCode?.(qrCode);
              
              // Reset attempt counter after successful QR
              totalAttempts = 0;
            } else {
              // Same QR code - system is stable
              console.log(`🔄 [QR-STABLE] Identical QR (${responseTime}ms) - system stable`);
            }
          } else {
            // Check if QR storage is not ready yet
            if (data.error && data.error.includes('not found')) {
              console.log(`⏰ [QR-STORAGE] QR not uploaded yet (${responseTime}ms) - waiting...`);
            } else {
              console.log(`⭕ [QR-STORAGE] No QR URL in response (${responseTime}ms)`);
            }
          }

          // Update status if provided
          if (data.status || data.stage) {
            this.onStatusUpdate?.(data);
          }
        } else {
          consecutiveFailures++;
          const errorText = await response.text();
          console.warn(`⚠️ [QR-ERROR] Polling failed #${consecutiveFailures}: ${response.status} (${responseTime}ms) - ${errorText}`);
          
          // If too many consecutive failures, log warning
          if (consecutiveFailures >= 5) {
            console.error(`🚨 [QR-ERROR] ${consecutiveFailures} consecutive failures - backend may be down`);
          }
        }
      } catch (error) {
        consecutiveFailures++;
        console.error(`❌ [QR-EXCEPTION] Polling error #${consecutiveFailures}:`, error);
      }
    };

    // Start polling with optimal timing
    console.log(`⚡ [QR-POLLING] Using optimized ${intervalMs}ms intervals for 2-second backend updates`);
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
   * Uses Supabase Storage for efficient QR retrieval
   */
  async refreshQRCode(jobId: string): Promise<string | null> {
    console.log(`🔄 [QR-REFRESH] Manual Storage refresh for job: ${jobId}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.qrStorageUrl}?job_id=${jobId}&_t=${Date.now()}`, {
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
        
        // Check for QR code URL in response (from Supabase Storage)
        if (data.qr_url && data.success) {
          const qrCode = data.qr_url; // Storage URL instead of base64
          console.log(`✅ [QR-REFRESH] Found QR Storage URL (${responseTime}ms)`);
          
          // Update tracking and send to callback
          this.lastQrCode = qrCode;
          this.lastQrTimestamp = Date.now();
          this.onQRCode?.(qrCode);
          
          return qrCode;
        } else {
          console.log(`⭕ [QR-REFRESH] No QR URL in Storage (${responseTime}ms)`);
          return null;
        }
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ [QR-REFRESH] Storage fetch failed: ${response.status} (${responseTime}ms) - ${errorText}`);
        return null;
      }
    } catch (error) {
      console.error('❌ [QR-REFRESH] Storage error:', error);
      return null;
    }
  }
}

// Singleton instance for easy use
export const vpsPolling = new VPSPollingService(); 