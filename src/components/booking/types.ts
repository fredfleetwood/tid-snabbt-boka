
export interface BookingSession {
  id: string;
  status: string;
  booking_details: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface BookingDetails {
  logs?: Array<{ message: string; timestamp: string; stage: string }>;
  message?: string;
  timestamp?: string;
  stage?: string;
  qr_code?: string;
  [key: string]: any;
}

export interface LogEntry {
  message: string;
  timestamp: string;
  stage: string;
}
