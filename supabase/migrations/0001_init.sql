-- IslandGo / IslandCab Dispatch Prototype — database schema
-- Run this once in the Supabase SQL editor for a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  status text not null default 'AVAILABLE'
    check (status in ('AVAILABLE', 'BUSY', 'OFFLINE')),
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  pickup_location text not null,
  destination text not null,
  passenger_count integer not null check (passenger_count between 1 and 12),
  pickup_date date not null,
  pickup_time time not null,
  notes text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED')),
  driver_id uuid references drivers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_status_idx on bookings(status);
create index if not exists bookings_driver_id_idx on bookings(driver_id);

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- Prototype-level security model:
--   - Both tables are readable by the anon key so the Admin/Driver
--     dashboards can subscribe to Realtime updates directly.
--   - No INSERT/UPDATE/DELETE grants exist for anon/authenticated —
--     all writes go through the Next.js API routes, which use the
--     service-role key (server-only) after validating the request and
--     the signed-in role. This keeps the anon key read-only.
--   - This is appropriate for a demo with non-sensitive seed data. For
--     a production rollout, tighten SELECT further (e.g. scope driver
--     reads to their own rides at the database level too) — see the
--     README's "Next Phase" section.
-- ---------------------------------------------------------------------

alter table drivers enable row level security;
alter table bookings enable row level security;

drop policy if exists "Public read access to drivers" on drivers;
create policy "Public read access to drivers"
  on drivers for select
  using (true);

drop policy if exists "Public read access to bookings" on bookings;
create policy "Public read access to bookings"
  on bookings for select
  using (true);

-- Intentionally no insert/update/delete policies for anon/authenticated:
-- the service-role key used by the API routes bypasses RLS entirely.

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table drivers;

-- ---------------------------------------------------------------------
-- Demo seed data
-- ---------------------------------------------------------------------

insert into drivers (name, phone, status) values
  ('John Driver', '+1 721 555 0101', 'AVAILABLE'),
  ('Mike Driver', '+1 721 555 0102', 'AVAILABLE'),
  ('Alex Driver', '+1 721 555 0103', 'AVAILABLE')
on conflict do nothing;

insert into bookings
  (customer_name, customer_phone, pickup_location, destination, passenger_count, pickup_date, pickup_time, notes, status)
values
  ('Maria Gonzalez', '+1 721 555 0201', 'Princess Juliana International Airport', 'Maho', 2, current_date, '14:30', 'Two suitcases, flight AA1234', 'PENDING'),
  ('David Chen', '+1 721 555 0202', 'Simpson Bay', 'Philipsburg', 1, current_date, '16:00', null, 'PENDING'),
  ('Sophie Laurent', '+1 721 555 0203', 'Marigot', 'Princess Juliana International Airport', 4, current_date + 1, '09:15', 'Traveling with kids, need extra room', 'PENDING')
on conflict do nothing;

-- Note: to line up the full demo flow (booking → assign John Driver →
-- accept → en route → arrived → completed), leave John Driver's row
-- untouched after seeding — its id is what you'll put in the
-- DEMO_DRIVER_ID environment variable (see .env.example / README).
