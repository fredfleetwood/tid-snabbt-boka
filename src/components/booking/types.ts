
export interface BookingSession {
  id: string;
  status: string;
  booking_details: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  config_id?: string;
}

export interface BookingDetails {
  logs?: Array<{ message: string; timestamp: string; stage: string }>;
  message?: string;
  timestamp?: string;
  stage?: string;
  qr_code?: string;
  cycle_count?: number;
  slots_found?: number;
  current_operation?: string;
  [key: string]: any;
}

export interface LogEntry {
  message: string;
  timestamp: string;
  stage: string;
  cycle?: number;
  operation?: string;
}
