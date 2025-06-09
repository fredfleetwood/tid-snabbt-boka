import { VPS_CONFIG } from '@/config/vps';
import {
  VPSBookingConfig,
  VPSJobResponse,
  VPSJobStatus,
  VPSSystemHealth,
  VPSError,
  VPSWebSocketMessage,
  VPSApiResponse
} from './types/vpsTypes';
import { VPSErrorHandler, retryVPSOperation } from '@/utils/vpsErrorHandler';

export class VPSServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'VPSServiceError';
  }
}

export class VPSService {
  private baseUrl: string;
  private apiToken: string;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private fallbackMode = false;

  constructor() {
    this.baseUrl = VPS_CONFIG.VPS_URL;
    this.apiToken = VPS_CONFIG.VPS_API_TOKEN;
  }

  // HTTP Request wrapper with enhanced error handling
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<VPSApiResponse<T>> {
    return retryVPSOperation(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const url = VPS_CONFIG.buildUrl(endpoint);
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...VPS_CONFIG.getAuthHeaders(),
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle specific HTTP status codes
          if (response.status === 401) {
            throw new VPSServiceError('Unauthorized', 'UNAUTHORIZED', 401);
          } else if (response.status === 429) {
            throw new VPSServiceError('Rate limited', 'RATE_LIMITED', 429);
          } else if (response.status === 503) {
            throw new VPSServiceError('Service unavailable', 'VPS_OVERLOADED', 503);
          } else if (response.status >= 500) {
            throw new VPSServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', response.status);
          }

          const errorData = await response.json().catch(() => ({}));
          throw new VPSServiceError(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
            errorData.error?.code || 'HTTP_ERROR',
            response.status,
            errorData
          );
        }

        const data = await response.json();
        this.fallbackMode = false; // Reset fallback mode on successful request
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof VPSServiceError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new VPSServiceError('Request timeout', 'TIMEOUT', 408);
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
          this.fallbackMode = true;
          throw new VPSServiceError(
            'Network error - unable to connect to VPS server',
            'NETWORK_ERROR',
            0
          );
        }

        throw new VPSServiceError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR',
          500
        );
      }
    }, `VPS Request: ${endpoint}`);
  }

  // Start booking automation with error handling
  async startBooking(config: VPSBookingConfig): Promise<VPSJobResponse> {
    console.log('VPS Service: Starting booking with config:', config);

    try {
      const response = await this.makeRequest<VPSJobResponse>(
        VPS_CONFIG.endpoints.booking.start,
        {
          method: 'POST',
          body: JSON.stringify({
            config,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.success || !response.data) {
        const error = new VPSServiceError(
          response.error?.message || 'Failed to start booking',
          'BOOKING_START_FAILED'
        );
        VPSErrorHandler.handleError(error, 'Start Booking');
        throw error;
      }

      console.log('VPS Service: Booking started successfully:', response.data);
      VPSErrorHandler.resetRetryCount('VPS Request: ' + VPS_CONFIG.endpoints.booking.start);
      return response.data;
    } catch (error) {
      console.error('VPS Service: Error starting booking:', error);
      
      if (this.fallbackMode) {
        return this.handleBookingFallback(config);
      }
      
      throw error;
    }
  }

  // Stop booking automation with error handling
  async stopBooking(jobId: string): Promise<boolean> {
    console.log('VPS Service: Stopping booking:', jobId);

    try {
      const response = await this.makeRequest<{ stopped: boolean }>(
        VPS_CONFIG.endpoints.booking.stop,
        {
          method: 'POST',
          body: JSON.stringify({
            job_id: jobId,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.success || !response.data) {
        const error = new VPSServiceError(
          response.error?.message || 'Failed to stop booking',
          'BOOKING_STOP_FAILED'
        );
        VPSErrorHandler.handleError(error, 'Stop Booking');
        throw error;
      }

      console.log('VPS Service: Booking stopped successfully');
      return response.data.stopped;
    } catch (error) {
      console.error('VPS Service: Error stopping booking:', error);
      VPSErrorHandler.handleError(error as Error, 'Stop Booking');
      throw error;
    }
  }

  // Get job status with error handling
  async getJobStatus(jobId: string): Promise<VPSJobStatus> {
    console.log('VPS Service: Getting job status:', jobId);

    try {
      const response = await this.makeRequest<VPSJobStatus>(
        `${VPS_CONFIG.endpoints.booking.status}/${jobId}`
      );

      if (!response.success || !response.data) {
        const error = new VPSServiceError(
          response.error?.message || 'Failed to get job status',
          'STATUS_FETCH_FAILED'
        );
        VPSErrorHandler.handleError(error, 'Get Job Status', false); // Don't show toast for status checks
        throw error;
      }

      return response.data;
    } catch (error) {
      console.error('VPS Service: Error getting job status:', error);
      VPSErrorHandler.handleError(error as Error, 'Get Job Status', false);
      throw error;
    }
  }

  // Get QR code for BankID authentication
  async getQRCode(jobId: string): Promise<string | null> {
    console.log('VPS Service: Getting QR code for job:', jobId);

    try {
      const response = await this.makeRequest<{ qr_code: string }>(
        `${VPS_CONFIG.endpoints.booking.status}/${jobId}/qr`
      );

      if (!response.success || !response.data) {
        console.log('VPS Service: No QR code available');
        return null;
      }

      return response.data.qr_code;
    } catch (error) {
      console.error('VPS Service: Error getting QR code:', error);
      return null;
    }
  }

  // Get system health with enhanced error handling
  async getSystemHealth(): Promise<VPSSystemHealth> {
    console.log('VPS Service: Checking system health');

    try {
      const response = await this.makeRequest<VPSSystemHealth>(
        VPS_CONFIG.endpoints.health
      );

      if (!response.success || !response.data) {
        throw new VPSServiceError(
          response.error?.message || 'Failed to get system health',
          'HEALTH_CHECK_FAILED'
        );
      }

      return response.data;
    } catch (error) {
      console.error('VPS Service: Error checking system health:', error);
      VPSErrorHandler.handleError(error as Error, 'System Health Check', false);
      
      // Return degraded status if health check fails
      return {
        status: 'down',
        uptime: 0,
        browser_count: 0,
        active_jobs: 0,
        memory_usage: 0,
        cpu_usage: 0,
        last_check: new Date().toISOString(),
      };
    }
  }

  // Enhanced WebSocket connection with error handling
  connectWebSocket(
    jobId: string,
    onMessage: (message: VPSWebSocketMessage) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void
  ): void {
    console.log('VPS Service: Connecting WebSocket for job:', jobId);

    try {
      this.disconnectWebSocket();

      const wsUrl = `${this.baseUrl.replace('http', 'ws')}/ws/${jobId}?token=${this.apiToken}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('VPS Service: WebSocket connected');
        this.reconnectAttempts = 0;
        VPSErrorHandler.resetRetryCount('WebSocket Connection');
      };

      this.websocket.onmessage = (event) => {
        try {
          const message: VPSWebSocketMessage = JSON.parse(event.data);
          console.log('VPS Service: WebSocket message received:', message);
          onMessage(message);
        } catch (error) {
          console.error('VPS Service: Error parsing WebSocket message:', error);
          VPSErrorHandler.handleError(
            new Error('Invalid WebSocket message format'),
            'WebSocket Message Parse',
            false
          );
        }
      };

      this.websocket.onerror = (error) => {
        console.error('VPS Service: WebSocket error:', error);
        VPSErrorHandler.handleError(
          new Error('WebSocket connection error'),
          'WebSocket Error'
        );
        if (onError) onError(error);
      };

      this.websocket.onclose = (event) => {
        console.log('VPS Service: WebSocket closed:', event.code, event.reason);
        this.websocket = null;

        if (onClose) onClose(event);

        // Handle different close codes
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          if (event.code === 1006) {
            // Abnormal closure
            VPSErrorHandler.handleError(
              new Error('WebSocket connection lost'),
              'WebSocket Abnormal Closure'
            );
          }
          this.scheduleReconnect(jobId, onMessage, onError, onClose);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          VPSErrorHandler.handleError(
            new Error('Max WebSocket reconnection attempts exceeded'),
            'WebSocket Max Reconnect'
          );
        }
      };
    } catch (error) {
      console.error('VPS Service: Error creating WebSocket connection:', error);
      VPSErrorHandler.handleError(
        error as Error,
        'WebSocket Creation'
      );
      if (onError) onError(error as Event);
    }
  }

  // Schedule WebSocket reconnection
  private scheduleReconnect(
    jobId: string,
    onMessage: (message: VPSWebSocketMessage) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void
  ): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff, max 30s

    console.log(`VPS Service: Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket(jobId, onMessage, onError, onClose);
    }, delay);
  }

  // Disconnect WebSocket
  disconnectWebSocket(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.websocket) {
      console.log('VPS Service: Disconnecting WebSocket');
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }
  }

  // Get connection status
  getWebSocketStatus(): string {
    if (!this.websocket) return 'disconnected';
    
    switch (this.websocket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Ping VPS server to check connectivity
  async ping(): Promise<boolean> {
    try {
      const health = await this.getSystemHealth();
      return health.status !== 'down';
    } catch (error) {
      console.error('VPS Service: Ping failed:', error);
      return false;
    }
  }

  // Get booking logs
  async getBookingLogs(jobId: string, limit: number = 50): Promise<Array<{
    timestamp: string;
    level: string;
    message: string;
    stage?: string;
  }>> {
    console.log('VPS Service: Getting booking logs for job:', jobId);

    try {
      const response = await this.makeRequest<Array<any>>(
        `${VPS_CONFIG.endpoints.booking.logs}/${jobId}?limit=${limit}`
      );

      if (!response.success || !response.data) {
        throw new VPSServiceError(
          response.error?.message || 'Failed to get booking logs',
          response.error?.code || 'LOGS_FETCH_FAILED'
        );
      }

      return response.data;
    } catch (error) {
      console.error('VPS Service: Error getting booking logs:', error);
      return [];
    }
  }

  // Fallback handler for when VPS is unavailable
  private async handleBookingFallback(config: VPSBookingConfig): Promise<VPSJobResponse> {
    console.log('VPS Service: Handling booking in fallback mode');
    
    // Return a mock response indicating fallback mode
    return {
      success: true,
      job_id: `fallback-${Date.now()}`,
      message: 'Bokning startad i fallback-läge',
      started_at: new Date().toISOString()
    };
  }

  // Check if service is in fallback mode
  isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  // Force fallback mode (for testing or manual override)
  setFallbackMode(enabled: boolean): void {
    this.fallbackMode = enabled;
    if (enabled) {
      VPSErrorHandler.handleError(
        'VPS_OFFLINE',
        'Manual Fallback Mode'
      );
    }
  }
}

// Export singleton instance
export const vpsService = new VPSService();
export default vpsService;
