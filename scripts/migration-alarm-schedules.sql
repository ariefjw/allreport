-- Migration: Create alarm_schedules table
-- Jalankan di Supabase SQL Editor

create table if not exists alarm_schedules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  alarm_time time not null,
  label text not null default '',
  days_of_week int2 not null default 127,
  target_page text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alarm_schedules_user on alarm_schedules(user_id, enabled);

-- Enable Row Level Security
alter table alarm_schedules enable row level security;

-- RLS policies
create policy "Users can view their own alarms"
  on alarm_schedules for select
  using (auth.uid() = user_id);

create policy "Users can create their own alarms"
  on alarm_schedules for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own alarms"
  on alarm_schedules for update
  using (auth.uid() = user_id);

create policy "Users can delete their own alarms"
  on alarm_schedules for delete
  using (auth.uid() = user_id);
