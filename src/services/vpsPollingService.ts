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
  private baseUrl = 'http://87.106.247.92:8080';
  private authToken = 'Bearer test-secret-token-12345';
  private pollingInterval: NodeJS.Timeout | null = null;
  private wsConnection: WebSocket | null = null;
  private onStatusUpdate?: (status: VPSJobStatus) => void;
  private onQRCode?: (qrCode: string) => void;

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
        const response = await fetch(`${this.baseUrl}/api/v1/booking/${jobId}/qr`, {
          headers: {
            'Authorization': this.authToken,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📱 QR polling response:', data);
          
          if (data.qr_code || data.qr_code_base64) {
            const qrCode = data.qr_code_base64 || data.qr_code;
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
   * Connect to WebSocket for live updates
   */
  connectWebSocket(jobId: string): void {
    console.log(`🌐 Connecting to WebSocket for job: ${jobId}`);
    
    this.disconnectWebSocket();
    
    const wsUrl = `ws://87.106.247.92:8080/ws/${jobId}`;
    
    try {
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('✅ WebSocket connected');
      };
      
      this.wsConnection.onmessage = (event) => {
        try {
          const message: VPSWebSocketMessage = JSON.parse(event.data);
          console.log('📡 WebSocket message:', message);
          
          if (message.type === 'status_update' || message.type === 'progress') {
            this.onStatusUpdate?.(message.data);
          } else if (message.type === 'qr_code' && message.data.qr_code) {
            this.onQRCode?.(message.data.qr_code);
          }
        } catch (error) {
          console.error('❌ WebSocket message parsing error:', error);
        }
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
      
      this.wsConnection.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        
        // Auto-reconnect after 3 seconds if not manually closed
        if (event.code !== 1000) {
          setTimeout(() => {
            console.log('🔄 Reconnecting WebSocket...');
            this.connectWebSocket(jobId);
          }, 3000);
        }
      };
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
    }
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
      const response = await fetch(`${this.baseUrl}/api/v1/booking/${jobId}/status`, {
        headers: {
          'Authorization': this.authToken,
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