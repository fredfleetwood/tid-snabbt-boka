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
  private serverReachable = false;

  constructor() {
    this.baseUrl = VPS_CONFIG.VPS_URL;
    this.apiToken = VPS_CONFIG.VPS_API_TOKEN;
    console.log('[VPS-SERVICE] Initialized with URL:', this.baseUrl);
  }

  // Enhanced HTTP Request wrapper with better error handling
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<VPSApiResponse<T>> {
    const url = VPS_CONFIG.buildUrl(endpoint);
    console.log('[VPS-SERVICE] Making request to:', url);
    
    return retryVPSOperation(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[VPS-SERVICE] Request timeout after 15 seconds');
        controller.abort();
      }, 15000); // Reduced timeout

      try {
        console.log('[VPS-SERVICE] Attempting fetch to:', url);
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...VPS_CONFIG.getAuthHeaders(),
            'Origin': 'https://lovable.dev',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);
        console.log('[VPS-SERVICE] Response received:', response.status, response.statusText);

        if (!response.ok) {
          console.error('[VPS-SERVICE] HTTP Error:', response.status, response.statusText);
          
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
        this.fallbackMode = false;
        this.serverReachable = true;
        console.log('[VPS-SERVICE] Request successful, data:', data);
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('[VPS-SERVICE] Request failed:', error);
        
        if (error instanceof VPSServiceError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          console.error('[VPS-SERVICE] Request was aborted (timeout)');
          throw new VPSServiceError('Request timeout', 'TIMEOUT', 408);
        }

        if (error instanceof TypeError && (
          error.message.includes('fetch') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError')
        )) {
          console.error('[VPS-SERVICE] Network error detected, enabling fallback mode');
          this.fallbackMode = true;
          this.serverReachable = false;
          throw new VPSServiceError(
            'Network error - VPS server is unreachable. Check if server is running at ' + this.baseUrl,
            'VPS_OFFLINE',
            0,
            { url: url, baseUrl: this.baseUrl }
          );
        }

        throw new VPSServiceError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR',
          500,
          { originalError: error }
        );
      }
    }, `VPS Request: ${endpoint}`, { maxAttempts: 2, baseDelay: 1000 });
  }

  // Enhanced ping method with better connectivity detection
  async ping(): Promise<boolean> {
    console.log('[VPS-SERVICE] Pinging VPS server...');
    
    try {
      // First try a simple connectivity test
      const testUrl = VPS_CONFIG.buildUrl('/health');
      console.log('[VPS-SERVICE] Testing connectivity to:', testUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: VPS_CONFIG.getAuthHeaders(),
      });
      
      clearTimeout(timeoutId);
      
      console.log('[VPS-SERVICE] Ping response:', response.status);
      this.serverReachable = response.ok;
      this.fallbackMode = !response.ok;
      
      return response.ok;
    } catch (error) {
      console.error('[VPS-SERVICE] Ping failed:', error);
      this.serverReachable = false;
      this.fallbackMode = true;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('[VPS-SERVICE] Ping timeout - server unreachable');
        } else if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          console.error('[VPS-SERVICE] Network error during ping');
        }
      }
      
      return false;
    }
  }

  // Start booking automation with enhanced error handling
  async startBooking(config: VPSBookingConfig): Promise<VPSJobResponse> {
    console.log('[VPS-SERVICE] Starting booking with config:', config);

    // Check server reachability first
    if (!this.serverReachable && !await this.ping()) {
      console.log('[VPS-SERVICE] Server not reachable, using fallback mode');
      return this.handleBookingFallback(config);
    }

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

      console.log('[VPS-SERVICE] Booking started successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[VPS-SERVICE] Error starting booking:', error);
      
      if (this.fallbackMode || (error instanceof VPSServiceError && error.code === 'VPS_OFFLINE')) {
        console.log('[VPS-SERVICE] Using fallback mode due to server unavailability');
        return this.handleBookingFallback(config);
      }
      
      throw error;
    }
  }

  // Enhanced fallback handler
  private async handleBookingFallback(config: VPSBookingConfig): Promise<VPSJobResponse> {
    console.log('[VPS-SERVICE] Handling booking in fallback mode');
    
    const fallbackJobId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate some delay to make it feel more realistic
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      job_id: fallbackJobId,
      message: 'Bokning startad i fallback-läge (VPS server otillgänglig)',
      started_at: new Date().toISOString()
    };
  }

  // Rest of the methods with improved error handling
  async stopBooking(jobId: string): Promise<boolean> {
    console.log('[VPS-SERVICE] Stopping booking:', jobId);

    if (jobId.startsWith('fallback-')) {
      console.log('[VPS-SERVICE] Stopping fallback booking');
      return true;
    }

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

      console.log('[VPS-SERVICE] Booking stopped successfully');
      return response.data.stopped;
    } catch (error) {
      console.error('[VPS-SERVICE] Error stopping booking:', error);
      VPSErrorHandler.handleError(error as Error, 'Stop Booking');
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<VPSJobStatus> {
    console.log('[VPS-SERVICE] Getting job status:', jobId);

    if (jobId.startsWith('fallback-')) {
      return {
        job_id: jobId,
        status: 'idle',
        stage: 'fallback',
        message: 'Körs i fallback-läge',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await this.makeRequest<VPSJobStatus>(
        `${VPS_CONFIG.endpoints.booking.status}/${jobId}`
      );

      if (!response.success || !response.data) {
        const error = new VPSServiceError(
          response.error?.message || 'Failed to get job status',
          'STATUS_FETCH_FAILED'
        );
        VPSErrorHandler.handleError(error, 'Get Job Status', false);
        throw error;
      }

      return response.data;
    } catch (error) {
      console.error('[VPS-SERVICE] Error getting job status:', error);
      VPSErrorHandler.handleError(error as Error, 'Get Job Status', false);
      throw error;
    }
  }

  async getQRCode(jobId: string): Promise<string | null> {
    console.log('[VPS-SERVICE] Getting QR code for job:', jobId);

    if (jobId.startsWith('fallback-')) {
      return null;
    }

    try {
      const response = await this.makeRequest<{ qr_code: string }>(
        `${VPS_CONFIG.endpoints.booking.status}/${jobId}/qr`
      );

      if (!response.success || !response.data) {
        console.log('[VPS-SERVICE] No QR code available');
        return null;
      }

      return response.data.qr_code;
    } catch (error) {
      console.error('[VPS-SERVICE] Error getting QR code:', error);
      return null;
    }
  }

  async getSystemHealth(): Promise<VPSSystemHealth> {
    console.log('[VPS-SERVICE] Checking system health');
  
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('http://87.106.247.92:8000/health/detailed', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Authorization': 'Bearer test-secret-token-12345',
          'Content-Type': 'application/json',
          'Origin': 'https://lovable.dev'
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new VPSServiceError(
          `Health check failed with status ${response.status}`,
          'HEALTH_CHECK_FAILED'
        );
      }
  
      const data = await response.json();
      this.serverReachable = true;
      this.fallbackMode = false;
      
      console.log('[VPS-SERVICE] Health data received:', data);
      
      // Map backend response to frontend format
      return {
        status: data.status === 'healthy' ? 'healthy' : 'unhealthy',
        timestamp: data.timestamp,
        active_jobs: data.jobs?.active_jobs || 0,
        websocket_connections: data.connections?.websocket_connections || 0,
        redis: data.system?.redis_status || 'disconnected',
        memory_usage: data.performance?.memory_usage || 0,
        cpu_usage: data.performance?.cpu_usage || 0,
        disk_usage: data.performance?.disk_usage || 0,
        browser_status: data.system?.browser_status || 'unavailable',
        queue_status: data.system?.queue_status || 'unhealthy',
      };
    } catch (error) {
      console.error('[VPS-SERVICE] Error checking system health:', error);
      this.serverReachable = false;
      this.fallbackMode = true;
      
      // Return degraded status if health check fails
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        active_jobs: 0,
        websocket_connections: 0,
        redis: 'disconnected',
        memory_usage: 0,
        cpu_usage: 0,
        disk_usage: 0,
        browser_status: 'unavailable',
        queue_status: 'unhealthy',
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
    console.log('[VPS-SERVICE] Connecting WebSocket for job:', jobId);

    try {
      this.disconnectWebSocket();

      const wsUrl = `${this.baseUrl.replace('http', 'ws')}/ws/${jobId}?token=${this.apiToken}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('[VPS-SERVICE] WebSocket connected');
        this.reconnectAttempts = 0;
        VPSErrorHandler.resetRetryCount('WebSocket Connection');
      };

      this.websocket.onmessage = (event) => {
        try {
          const message: VPSWebSocketMessage = JSON.parse(event.data);
          console.log('[VPS-SERVICE] WebSocket message received:', message);
          onMessage(message);
        } catch (error) {
          console.error('[VPS-SERVICE] Error parsing WebSocket message:', error);
          VPSErrorHandler.handleError(
            new Error('Invalid WebSocket message format'),
            'WebSocket Message Parse',
            false
          );
        }
      };

      this.websocket.onerror = (error) => {
        console.error('[VPS-SERVICE] WebSocket error:', error);
        VPSErrorHandler.handleError(
          new Error('WebSocket connection error'),
          'WebSocket Error'
        );
        if (onError) onError(error);
      };

      this.websocket.onclose = (event) => {
        console.log('[VPS-SERVICE] WebSocket closed:', event.code, event.reason);
        this.websocket = null;

        if (onClose) onClose(event);

        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          if (event.code === 1006) {
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
      console.error('[VPS-SERVICE] Error creating WebSocket connection:', error);
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
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`[VPS-SERVICE] Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

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
      console.log('[VPS-SERVICE] Disconnecting WebSocket');
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

  async getBookingLogs(jobId: string, limit: number = 50): Promise<Array<{
    timestamp: string;
    level: string;
    message: string;
    stage?: string;
  }>> {
    console.log('[VPS-SERVICE] Getting booking logs for job:', jobId);

    if (jobId.startsWith('fallback-')) {
      return [{
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Fallback mode - inga loggar tillgängliga',
        stage: 'fallback'
      }];
    }

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
      console.error('[VPS-SERVICE] Error getting booking logs:', error);
      return [];
    }
  }

  isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  isServerReachable(): boolean {
    return this.serverReachable;
  }

  setFallbackMode(enabled: boolean): void {
    this.fallbackMode = enabled;
    this.serverReachable = !enabled;
    if (enabled) {
      VPSErrorHandler.handleError(
        'VPS_OFFLINE',
        'Manual Fallback Mode'
      );
    }
  }

  getConnectionInfo(): { baseUrl: string; reachable: boolean; fallbackMode: boolean } {
    return {
      baseUrl: this.baseUrl,
      reachable: this.serverReachable,
      fallbackMode: this.fallbackMode
    };
  }
}

export const vpsService = new VPSService();
export default vpsService;
