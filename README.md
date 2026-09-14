# IslandGo Dispatch — Free Prototype

A small, working proof-of-concept for **IslandCab** (the IslandGo brand) that demonstrates the
core dispatch loop:

**Customer books a ride → Admin dispatches a driver → Driver updates ride status → Admin sees it update live.**

This is **not** the full IslandGo MVP — see [What's intentionally out of scope](#whats-intentionally-out-of-scope-for-this-prototype).

---

## 1. What this prototype does

- A public booking form customers use to request a ride.
- An **Admin** dashboard that sees new bookings the instant they're submitted, and can assign an
  available driver with one click.
- A **Driver** dashboard (mobile-friendly) that receives the assigned ride instantly and lets the
  driver move it through: Accept → En route → Arrived → Completed.
- All of the above updates **in real time**, with no manual refreshing, using Supabase Realtime.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Database | Supabase (Postgres) |
| Realtime | Supabase Realtime (`postgres_changes` on `bookings` and `drivers`) |
| Auth | Supabase Auth (email/password), roles via a `profiles` table, cookie session via `@supabase/ssr` |
| Deployment target | Vercel (frontend) + Supabase (database) |

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only — never exposed to the browser
```

On Vercel, add the same variables under Project Settings → Environment Variables.

As of the Phase 1 migration there are no demo-credential env vars — admin and
driver sign-in uses real Supabase Auth accounts (see §4a below).

## 4. Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor and run the migrations in order:
   - **`supabase/migrations/0001_init.sql`** — creates `bookings` and `drivers`, enables RLS,
     sets up Realtime, and seeds 3 drivers and 3 sample bookings.
   - **`supabase/migrations/0002_auth_rbac_audit.sql`** — adds `profiles` (role per Supabase Auth
     user), links `drivers` to real auth users, adds the `audit_log` table, and **replaces the
     public-read RLS policies** with role-scoped ones. Read the comments at the bottom of this
     file before running it — it also tells you what to do next (§4a).
3. Copy the project URL and keys from Project Settings → API into `.env.local`.

### 4a. Create real admin and driver accounts

There is no self-service sign-up and no seeded demo login after 0002 runs. For each person who
needs access:

1. **Authentication → Users → Add user** in the Supabase dashboard (or the Admin API), with their
   real email and a password (or send a magic link / invite, if you prefer).
2. Give them a role:
   ```sql
   insert into profiles (id, role, display_name)
   values ('<auth-user-uuid>', 'admin', 'Ops Manager'); -- or 'driver'
   ```
3. For a **driver**, also link their seeded (or newly created) `drivers` row:
   ```sql
   update drivers set auth_user_id = '<auth-user-uuid>' where id = '<drivers-row-id>';
   ```

Until a `drivers` row has `auth_user_id` set, that person can authenticate but the app has no way
to know which rides are theirs.

## 5. Database tables

```
bookings                          drivers
---------                         -------
id                                id
customer_name                     name
customer_phone                    phone
pickup_location                   status (AVAILABLE | BUSY | OFFLINE)
destination                       created_at
passenger_count
pickup_date
pickup_time
notes
status  (PENDING | ASSIGNED | ACCEPTED | EN_ROUTE | ARRIVED | COMPLETED | CANCELLED)
driver_id
created_at
updated_at
```

## 6. Running locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the booking form, `/login` to sign in as Admin or Driver.

To verify a production build:

```bash
npm run build
npm run start
```

## 7. Accounts

Two roles, backed by real Supabase Auth users and a `profiles.role` column — see §4a above for
how to create an admin or driver account. There is no sign-up flow; accounts are provisioned by
whoever administers the Supabase project.

## 8. How real-time updates work

Both the Admin and Driver dashboards open a Supabase Realtime channel and subscribe to
`postgres_changes` events on the `bookings` table (the driver dashboard filters to its own
`driver_id`). Every insert or update — a new booking, a driver assignment, a status change —
is pushed to connected dashboards immediately, so:

- Admin sees a new booking the moment a customer submits the form.
- The Driver dashboard sees an assigned ride the moment Admin clicks "Assign."
- Admin sees every driver status change (Accepted → En route → Arrived → Completed) live.

All writes (create booking, assign driver, change status) go through Next.js API routes that use
the Supabase **service-role** key server-side — the browser only ever holds the public anon key.
As of the Phase 1 migration (`supabase/migrations/0002_auth_rbac_audit.sql`), that anon key can no
longer read anything unauthenticated: RLS scopes reads to signed-in admins (all rows) and signed-in
drivers (only their own assigned bookings and their own driver row). Every mutating action is also
recorded in `audit_log`. Booking status transitions are validated server-side against a fixed state
machine, so a driver can't skip a step or update a ride that isn't theirs, and a client can never
assign a driver ID directly — the API re-checks that the driver exists and is available first.

## 9. Scripted demo flow

1. Open `/` and submit a booking: Customer "John Smith", pickup "Princess Juliana International
   Airport", destination "Philipsburg", 2 passengers.
2. Open `/admin` (signed in with an admin account — see §4a) — the booking appears automatically.
3. Assign **John Driver** (requires John Driver's `drivers` row to have `auth_user_id` set).
4. Open `/driver` (signed in as that driver's account) — the assigned ride appears automatically.
5. Click "Accept ride" — Admin sees `ACCEPTED` instantly.
6. Click "Start driving (en route)" — Admin sees `EN_ROUTE` instantly.
7. Click "Mark arrived," then "Complete ride" — Admin sees every change live, with no refresh.

## 10. What's intentionally out of scope for this prototype

This free proof-of-concept deliberately excludes (all planned for the full MVP, not built here):
Stripe/SumUp payments, WhatsApp Business API, email notification infrastructure, hotel kiosk
mode, zone-based/night-surcharge pricing, advanced Google Places autocomplete, background GPS
tracking, native iOS/Android apps, revenue analytics and reporting, OTA integrations, corporate
accounts, multi-tenancy, fleet management, driver navigation/route optimization, AI auto-dispatch,
and production-grade scaling architecture.

The map uses **OpenStreetMap** (via Leaflet + Nominatim) — no paid API key, no Google Maps
billing. Pickup/destination are still plain text fields (no autocomplete), but they resolve to a
live map with two markers: known demo locations (Princess Juliana Intl. Airport, Philipsburg,
Marigot, Simpson Bay, Maho) resolve instantly and locally; any other address is geocoded
server-side through `/api/geocode`, which calls OpenStreetMap's free Nominatim service with a
proper User-Agent header and a 1-request/second rate limit, per Nominatim's usage policy. The map
appears live on the booking form (as you type), on the driver's ride card, and behind a
"View route" toggle on each active ride in the admin dashboard. This is display-only — no live
GPS tracking or route optimization, matching the prototype's scope.

**Security note (updated for Phase 1):** reads are no longer public. RLS scopes `SELECT` on
`bookings`/`drivers` to authenticated admins (all rows) and authenticated drivers (their own rows
only) — see `supabase/migrations/0002_auth_rbac_audit.sql`. All writes still go exclusively
through the service-role key behind the validated API routes in `app/api/`. Still open for a full
production rollout: rate limiting on the public booking-creation and login endpoints, and
per-request request-size/abuse limits generally — see Next Phase below.

## 11. Next phase — extending this into the full IslandGo MVP

**Done (Phase 1 — this migration):** real Supabase Auth accounts with roles, RLS locked down to
scoped reads (no more public read access), append-only audit log of assign/status-change actions,
startup-time environment variable validation (`lib/env.ts`).

**Still open:**
- Admin: manual booking create/edit, driver roster CRUD (vehicle info, availability toggle),
  suggested/zone-based driver assignment, rides-per-driver/revenue/zone reporting.
- Driver: accept/decline (not just accept), browser geolocation while a ride is active, with the
  location visible to Admin.
- Payments (Stripe required, SumUp optional) tied to completed rides.
- WhatsApp Business API and/or email notifications for booking confirmations and status changes.
- Google Places/Mapbox autocomplete for pickup/destination, with zone detection and zone-based +
  night-surcharge pricing; tour booking flow (fixed itinerary, no pickup/dropoff).
- Hotel kiosk mode with dedicated kiosk identities, simplified UI, and auto-reset.
- Rate limiting on public endpoints (`/api/bookings` POST, `/api/auth/login`).
- Fleet management (driver onboarding/documents) and multi-tenant support, if needed later.
