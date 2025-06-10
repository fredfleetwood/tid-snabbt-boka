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
  private wsConnection: WebSocket | null = null;
  private onStatusUpdate?: (status: VPSJobStatus) => void;
  private onQRCode?: (qrCode: string) => void;
  private isHTTPS: boolean;
  
  // QR code deduplication
  private lastQrCode: string = '';
  private qrUpdateCount: number = 0;
  private lastQrTimestamp: number = 0;

  constructor(
    onStatusUpdate?: (status: VPSJobStatus) => void,
    onQRCode?: (qrCode: string) => void
  ) {
    this.onStatusUpdate = onStatusUpdate;
    this.onQRCode = onQRCode;
  }

  /**
   * Start polling for QR codes for a specific job - OPTIMIZED FOR BANKID 2-SECOND REFRESH
   */
  async startQRPolling(jobId: string, intervalMs: number = 1000): Promise<void> {
    console.log(`🔍 [QR-POLLING] Starting for job: ${jobId} (interval: ${intervalMs}ms)`);
    
    this.stopQRPolling(); // Stop any existing polling
    
    // Reset QR tracking
    this.lastQrCode = '';
    this.qrUpdateCount = 0;
    this.lastQrTimestamp = 0;
    
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

    // Poll immediately, then on consistent interval (NO MORE SWITCHING!)
    console.log(`⚡ [QR-POLLING] Using CONSISTENT ${intervalMs}ms interval (no switching)`);
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
        console.log('📊 Job status:', status);
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
    this.disconnectWebSocket();
    console.log('🧹 VPS polling service cleaned up');
  }
}

// Singleton instance for easy use
export const vpsPolling = new VPSPollingService(); 