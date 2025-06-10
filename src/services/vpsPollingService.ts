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

  constructor(
    onStatusUpdate?: (status: VPSJobStatus) => void,
    onQRCode?: (qrCode: string) => void
  ) {
    this.onStatusUpdate = onStatusUpdate;
    this.onQRCode = onQRCode;
  }

  /**
   * Start polling for QR codes for a specific job
   */
  async startQRPolling(jobId: string, intervalMs: number = 2000): Promise<void> {
    console.log(`🔍 Starting QR polling for job: ${jobId}`);
    
    this.stopQRPolling(); // Stop any existing polling
    
    const pollQRCode = async () => {
      try {
        const response = await fetch(`${this.baseUrl}?job_id=${jobId}&action=qr`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'apikey': this.authToken,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📱 QR polling response:', data);
          
          if (data.qr_code || data.qr_code_base64 || data.image_data) {
            const qrCode = data.image_data || data.qr_code_base64 || data.qr_code;
            console.log('✅ QR code received');
            this.onQRCode?.(qrCode);
          }

          // Update status if provided
          if (data.status || data.stage) {
            this.onStatusUpdate?.(data);
          }
        } else {
          console.warn('⚠️ QR polling failed:', response.status, await response.text());
        }
      } catch (error) {
        console.error('❌ QR polling error:', error);
      }
    };

    // Poll immediately, then on interval
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
      console.log('⏹️ QR polling stopped');
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