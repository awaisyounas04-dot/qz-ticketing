-- ============================================================
-- QZ Industrial Ticketing System — Supabase SQL Schema v2
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Drop old table if exists (WARNING: deletes existing data)
-- Comment this out if you want to keep existing data
-- drop table if exists public.tickets;

-- 2. Create tickets table
create table if not exists public.tickets (
  ticket_number       text primary key,
  device_type         text not null,
  serial              text,
  issue_description   text,
  priority            text default 'normal' check (priority in ('low', 'normal', 'high')),
  technician          text,
  estimated_cost      numeric(10, 2),
  parts_cost          numeric(10, 2),
  labour_cost         numeric(10, 2),
  actual_cost         numeric(10, 2),
  completion_notes    text,
  notes               text,
  status              text default 'new' check (status in (
                        'new',
                        'diagnosed',
                        'quote_sent',
                        'awaiting_approval',
                        'parts_sourced',
                        'ready_for_delivery',
                        'completed'
                      )),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 3. Auto-update updated_at
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

-- 4. Enable Realtime
alter publication supabase_realtime add table public.tickets;

-- 5. Row Level Security
alter table public.tickets enable row level security;

drop policy if exists "Allow all operations" on public.tickets;
create policy "Allow all operations" on public.tickets
  for all using (true) with check (true);

-- ============================================================
-- If you had an old tickets table and want to migrate:
-- ALTER TABLE tickets
--   ADD COLUMN IF NOT EXISTS parts_cost numeric(10,2),
--   ADD COLUMN IF NOT EXISTS labour_cost numeric(10,2),
--   ADD COLUMN IF NOT EXISTS completion_notes text;
-- ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
-- ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
--   CHECK (status IN ('new','diagnosed','quote_sent','awaiting_approval',
--                     'parts_sourced','ready_for_delivery','completed'));
-- ============================================================
