

export interface VPSSystemHealth {
  status: 'healthy' | 'unhealthy' | 'online' | 'offline' | 'degraded';
  uptime?: number;
  memory_usage: number;
  cpu_usage: number;
  active_sessions?: number;
  browser_count?: number;
  version?: string;
  last_check?: string;
  timestamp: string;
  active_jobs: number;
  websocket_connections: number;
  redis: string;
  disk_usage: number;
  browser_status: string;
  queue_status: string;
}

export interface VPSBookingConfig {
  user_id: string;
  config_id: string;
  personnummer: string;
  license_type: string;
  exam: string;
  vehicle_language: string[];
  locations: string[];
  date_ranges?: { from: string; to: string; }[];
}

export interface VPSJobResponse {
  success: boolean;
  job_id: string;
  message: string;
  started_at: string;
}

export interface VPSJobStatus {
  job_id: string;
  status: 'idle' | 'initializing' | 'waiting_bankid' | 'searching' | 'booking' | 'completed' | 'error' | 'cancelled' | 'pending' | 'running' | 'failed';
  progress?: number;
  message: string;
  created_at?: string;
  updated_at?: string;
  logs?: string[];
  stage?: string;
  timestamp?: string;
  qr_code?: string;
  cycle_count?: number;
  slots_found?: number;
  current_operation?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface VPSConnectionConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  apiKey: string;
}

export interface VPSError {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
}

export interface VPSWebSocketMessage {
  type: 'status_update' | 'qr_code' | 'error' | 'log' | 'completion';
  job_id?: string;
  data: any;
  timestamp: string;
}

export interface VPSApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: VPSError;
  timestamp?: string;
}

