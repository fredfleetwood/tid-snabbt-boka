
export interface VPSSystemHealth {
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  memory_usage: number;
  cpu_usage: number;
  active_sessions: number;
  browser_count: number;
  version: string;
  last_check: string;
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
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  created_at: string;
  updated_at: string;
  logs?: string[];
}

export interface VPSConnectionConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  apiKey: string;
}
