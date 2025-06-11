-- System-wide logging table for debugging the booking flow
create table if not exists "public"."system_logs" (
    "id" uuid not null default gen_random_uuid(),
    "timestamp" timestamp with time zone not null default now(),
    "level" text not null default 'info', -- debug, info, warn, error
    "component" text not null, -- frontend, edge-function, vps, database
    "operation" text not null, -- start-booking, qr-update, status-change, etc.
    "user_id" uuid,
    "session_id" uuid,
    "job_id" text,
    "message" text not null,
    "data" jsonb default '{}',
    "duration_ms" integer,
    "error_details" jsonb,
    "trace_id" text, -- For tracing requests across components
    "step_number" integer, -- Sequential step in the flow
    "created_at" timestamp with time zone not null default now()
);

-- Enable RLS
alter table "public"."system_logs" enable row level security;

-- Indexes for performance
create index if not exists idx_system_logs_timestamp on system_logs(timestamp desc);
create index if not exists idx_system_logs_component on system_logs(component);
create index if not exists idx_system_logs_operation on system_logs(operation);
create index if not exists idx_system_logs_user_id on system_logs(user_id);
create index if not exists idx_system_logs_trace_id on system_logs(trace_id);
create index if not exists idx_system_logs_job_id on system_logs(job_id);

-- RLS Policies
create policy "Anyone can insert logs" on "public"."system_logs"
    as permissive for insert to public with check (true);

create policy "Anyone can view logs" on "public"."system_logs"
    as permissive for select to public using (true);

-- Grant permissions
grant all on table "public"."system_logs" to anon;
grant all on table "public"."system_logs" to authenticated;
grant all on table "public"."system_logs" to service_role; 