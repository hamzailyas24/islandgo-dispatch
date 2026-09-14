-- IslandGo / IslandCab — Phase 1: real accounts, role-scoped RLS, audit log
--
-- This migration REMOVES the prototype's public-read RLS policies and
-- replaces the env-var demo login with real Supabase Auth users. Run this
-- against a project that already has 0001_init.sql applied.
--
-- After running this file, no booking or driver data is readable by the
-- anon (unauthenticated) key. The booking portal and kiosk mode read/write
-- exclusively through the Next.js API routes (service-role key, server
-- side). Admin and Driver dashboards authenticate with Supabase Auth and
-- read directly via RLS-scoped Realtime/SELECT.

-- ---------------------------------------------------------------------
-- 1. profiles — one row per staff/admin Supabase Auth user, carrying role
-- ---------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'driver')),
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can read their own profile" on profiles;
create policy "Users can read their own profile"
  on profiles for select
  using (id = auth.uid());

-- No insert/update/delete policy for authenticated/anon: profile rows are
-- provisioned by an admin via the service-role key (see README §4 in this
-- migration's companion docs), never self-service.

-- ---------------------------------------------------------------------
-- 2. Link drivers to real Supabase Auth users
-- ---------------------------------------------------------------------

alter table drivers add column if not exists auth_user_id uuid references auth.users(id);
create unique index if not exists drivers_auth_user_id_idx on drivers(auth_user_id) where auth_user_id is not null;

-- ---------------------------------------------------------------------
-- 3. Helper functions used by RLS policies below
-- ---------------------------------------------------------------------

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function current_driver_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from drivers where auth_user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 4. audit_log — append-only record of dispatch-affecting actions
-- ---------------------------------------------------------------------

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on audit_log(entity_type, entity_id);

alter table audit_log enable row level security;

drop policy if exists "Admins can read audit log" on audit_log;
create policy "Admins can read audit log"
  on audit_log for select
  using (is_admin());

-- No insert/update/delete policy for authenticated/anon: only the
-- service-role key (server-only, in lib/audit.ts) writes audit rows, so
-- the log can't be tampered with or deleted from the client.

-- ---------------------------------------------------------------------
-- 5. Lock down drivers / bookings RLS — remove public read, add scoped read
-- ---------------------------------------------------------------------

drop policy if exists "Public read access to drivers" on drivers;
drop policy if exists "Public read access to bookings" on bookings;

drop policy if exists "Admins can read all drivers" on drivers;
create policy "Admins can read all drivers"
  on drivers for select
  using (is_admin());

drop policy if exists "Drivers can read their own driver row" on drivers;
create policy "Drivers can read their own driver row"
  on drivers for select
  using (auth_user_id = auth.uid());

drop policy if exists "Admins can read all bookings" on bookings;
create policy "Admins can read all bookings"
  on bookings for select
  using (is_admin());

drop policy if exists "Drivers can read their assigned bookings" on bookings;
create policy "Drivers can read their assigned bookings"
  on bookings for select
  using (driver_id = current_driver_id());

-- Still no insert/update/delete policies for authenticated/anon on either
-- table — all writes continue to go through the service-role key behind
-- the validated API routes in app/api/. This is unchanged from 0001; only
-- the SELECT surface has been tightened.

-- ---------------------------------------------------------------------
-- 6. Notes for applying this migration to an existing project
-- ---------------------------------------------------------------------
--
-- 1. Create real Supabase Auth users for each admin/dispatcher and each
--    driver (Dashboard → Authentication → Users → Add user, or the
--    Admin API). Use real email addresses — this is how they'll sign in.
-- 2. For each user, insert a matching profiles row, e.g.:
--      insert into profiles (id, role, display_name)
--      values ('<auth-user-uuid>', 'admin', 'Ops Manager');
-- 3. For each driver user, also link their drivers row:
--      update drivers set auth_user_id = '<auth-user-uuid>'
--      where id = '<drivers-row-id>';
-- 4. Remove DEMO_ADMIN_*/DEMO_DRIVER_* env vars once staff are migrated —
--    they are no longer read by the login route after this phase.
