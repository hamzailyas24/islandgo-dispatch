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
| Auth | Minimal signed-cookie demo session (see [Authentication](#10-authentication) in the spec — no password reset, no social login) |
| Deployment target | Vercel (frontend) + Supabase (database) |

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only — never exposed to the browser
SESSION_SECRET=                  # any long random string
DEMO_ADMIN_USERNAME=
DEMO_ADMIN_PASSWORD=
DEMO_DRIVER_USERNAME=
DEMO_DRIVER_PASSWORD=
DEMO_DRIVER_ID=                  # id of the seeded "John Driver" row (see step 4 below)
DEMO_DRIVER_NAME=John Driver
```

On Vercel, add the same variables under Project Settings → Environment Variables.

## 4. Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor and run **`supabase/schema.sql`** in this repo. It creates the `bookings`
   and `drivers` tables, enables Row Level Security, sets up Realtime, and seeds demo data
   (3 drivers: John Driver, Mike Driver, Alex Driver; 3 sample bookings around Princess Juliana
   International Airport, Philipsburg, Marigot, Simpson Bay, and Maho).
3. Copy the project URL and keys from Project Settings → API into `.env.local`.
4. In the Table Editor, open `drivers`, copy **John Driver's `id`**, and paste it into
   `DEMO_DRIVER_ID`. This links the single demo driver login to that seeded row so the scripted
   demo flow below works end to end.

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

## 7. Demo accounts

Two roles, set via environment variables (see above) — no sign-up flow, matching the prototype's
intentionally minimal auth:

- **Admin** — `DEMO_ADMIN_USERNAME` / `DEMO_ADMIN_PASSWORD`
- **Driver** — `DEMO_DRIVER_USERNAME` / `DEMO_DRIVER_PASSWORD` (mapped to the seeded "John Driver" row)

## 8. How real-time updates work

Both the Admin and Driver dashboards open a Supabase Realtime channel and subscribe to
`postgres_changes` events on the `bookings` table (the driver dashboard filters to its own
`driver_id`). Every insert or update — a new booking, a driver assignment, a status change —
is pushed to connected dashboards immediately, so:

- Admin sees a new booking the moment a customer submits the form.
- The Driver dashboard sees an assigned ride the moment Admin clicks "Assign."
- Admin sees every driver status change (Accepted → En route → Arrived → Completed) live.

All writes (create booking, assign driver, change status) go through Next.js API routes that use
the Supabase **service-role** key server-side — the browser only ever holds the public anon key,
which is read-only under this schema's RLS policies (see `supabase/schema.sql` for the reasoning).
Booking status transitions are validated server-side against a fixed state machine, so a driver
can't skip a step or update a ride that isn't theirs, and a client can never assign a driver ID
directly — the API re-checks that the driver exists and is available first.

## 9. Scripted demo flow

1. Open `/` and submit a booking: Customer "John Smith", pickup "Princess Juliana International
   Airport", destination "Philipsburg", 2 passengers.
2. Open `/admin` (signed in as Admin) — the booking appears automatically.
3. Assign **John Driver**.
4. Open `/driver` (signed in as the Driver account) — the assigned ride appears automatically.
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

The map/location piece is intentionally minimal — text fields for pickup/destination, no live
GPS tracking or route optimization.

**Prototype-level security note:** to keep the demo simple, both tables allow public read access
via Supabase RLS so the dashboards can subscribe to Realtime directly; all writes are locked to
the service-role key behind validated API routes. For a production rollout, reads should also be
scoped server-side (e.g., a driver's dashboard querying through an authenticated API rather than
a public anon-key read) — see Next Phase below.

## 11. Next phase — extending this into the full IslandGo MVP

- Payments (Stripe/SumUp) tied to completed rides.
- WhatsApp Business API and/or SMS/email notifications for booking confirmations and status changes.
- Proper user accounts for customers, with ride history.
- Google Places autocomplete for pickup/destination with live map preview.
- Live GPS tracking of drivers and ETA calculation.
- Zone-based and time-of-day pricing, night surcharges.
- Hotel kiosk mode with dedicated kiosk IDs for hotel front desks.
- Fleet management: driver onboarding, documents, vehicle assignment.
- Reporting and revenue analytics dashboards for operators.
- Tightened, production-grade RLS (row-level scoping per role, not public read).
- Multi-tenant support if IslandGo expands to other locations/operators.
