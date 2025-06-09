
// VPS Service Types and Interfaces

export interface VPSBookingConfig {
  personnummer: string;
  license_type: string;
  exam: 'Körprov' | 'Kunskapsprov';
  vehicle_language: string[];
  date_ranges: Array<{
    from: string;
    to: string;
  }>;
  locations: string[];
  user_id: string;
  config_id: string;
}

export interface VPSJobResponse {
  success: boolean;
  job_id: string;
  message?: string;
  error?: string;
}

export interface VPSJobStatus {
  job_id: string;
  status: 'idle' | 'initializing' | 'waiting_bankid' | 'searching' | 'booking' | 'completed' | 'error' | 'cancelled';
  stage?: string;
  message?: string;
  timestamp: string;
  qr_code?: string;
  cycle_count?: number;
  slots_found?: number;
  current_operation?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface VPSSystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  browser_count: number;
  active_jobs: number;
  memory_usage: number;
  cpu_usage: number;
  last_check: string;
  version?: string;
}

export interface VPSError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface VPSWebSocketMessage {
  type: 'status_update' | 'qr_code' | 'error' | 'log' | 'completion';
  job_id: string;
  data: any;
  timestamp: string;
}

export interface VPSApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: VPSError;
  timestamp: string;
}
