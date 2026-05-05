-- ============================================================
-- QZ Industrial Ticketing System — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create tickets table
create table if not exists public.tickets (
  ticket_number     text primary key,
  customer_name     text not null,
  contact           text,
  device_type       text,
  serial            text,
  issue_description text,
  priority          text default 'normal' check (priority in ('low', 'normal', 'high')),
  technician        text,
  estimated_cost    numeric(10, 2),
  actual_cost       numeric(10, 2),
  notes             text,
  status            text default 'intake' check (status in ('intake', 'approved', 'completed')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- 2. Auto-update updated_at on every row change
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tickets_updated_at on public.tickets;
create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.update_updated_at();

-- 3. Enable Realtime (live sync across users)
alter publication supabase_realtime add table public.tickets;

-- 4. Row Level Security — allow public access via anon key
alter table public.tickets enable row level security;

drop policy if exists "Allow all operations" on public.tickets;
create policy "Allow all operations" on public.tickets
  for all
  using (true)
  with check (true);

-- ============================================================
-- Done! Your tickets table is ready.
-- ============================================================
