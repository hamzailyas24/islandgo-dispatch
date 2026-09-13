"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking, Driver } from "@/lib/types";

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<{ bookingId: string; driverId: string } | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    const [bookingsRes, driversRes] = await Promise.all([
      supabaseBrowser.from("bookings").select("*").order("created_at", { ascending: false }),
      supabaseBrowser.from("drivers").select("*").order("name", { ascending: true }),
    ]);
    if (bookingsRes.error || driversRes.error) {
      setLoadError("Couldn't load dispatch data. Check your Supabase connection.");
    } else {
      setBookings(bookingsRes.data as Booking[]);
      setDrivers(driversRes.data as Driver[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabaseBrowser
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
        setBookings((prev) => {
          if (payload.eventType === "INSERT") {
            return [payload.new as Booking, ...prev];
          }
          if (payload.eventType === "UPDATE") {
            return prev.map((b) => (b.id === (payload.new as Booking).id ? (payload.new as Booking) : b));
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((b) => b.id !== (payload.old as Booking).id);
          }
          return prev;
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, (payload) => {
        setDrivers((prev) => {
          if (payload.eventType === "UPDATE") {
            return prev.map((d) => (d.id === (payload.new as Driver).id ? (payload.new as Driver) : d));
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [loadData]);

  const pending = useMemo(() => bookings.filter((b) => b.status === "PENDING"), [bookings]);
  const active = useMemo(
    () => bookings.filter((b) => !["PENDING", "COMPLETED", "CANCELLED"].includes(b.status)),
    [bookings]
  );
  const history = useMemo(
    () => bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status)),
    [bookings]
  );

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  async function assignDriver(bookingId: string, driverId: string) {
    setAssigning({ bookingId, driverId });
    setBanner(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_id: driverId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Could not assign that driver." });
        return;
      }
      setBanner({ type: "success", text: "Driver assigned. The driver's dashboard will update instantly." });
    } catch {
      setBanner({ type: "error", text: "Network error while assigning the driver." });
    } finally {
      setAssigning(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-sand-200">
      <header className="bg-harbor-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-lagoon-300 text-sm font-medium">IslandGo Dispatch</p>
            <h1 className="text-xl font-semibold">Admin dashboard</h1>
          </div>
          <button onClick={logout} className="btn-outline border-white/20 text-white hover:bg-white/10">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {banner && (
          <div
            className={`rounded-xl px-4 py-3 text-sm border ${
              banner.type === "success"
                ? "bg-status-completed/10 border-status-completed/30 text-status-completed"
                : "bg-status-cancelled/10 border-status-cancelled/30 text-status-cancelled"
            }`}
          >
            {banner.text}
          </div>
        )}
        {loadError && (
          <div className="rounded-xl px-4 py-3 text-sm border bg-status-cancelled/10 border-status-cancelled/30 text-status-cancelled">
            {loadError}
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Drivers</h2>
          {drivers.length === 0 && !loading ? (
            <p className="text-sm text-harbor-900/60">No drivers seeded yet — see README for the seed script.</p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {drivers.map((d) => (
                <div key={d.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-harbor-900/50">{d.phone}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      d.status === "AVAILABLE"
                        ? "bg-status-completed/10 text-status-completed"
                        : d.status === "BUSY"
                        ? "bg-status-pending/10 text-status-pending"
                        : "bg-harbor-900/10 text-harbor-900/60"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Pending bookings ({pending.length})</h2>
          {loading ? (
            <SkeletonRows />
          ) : pending.length === 0 ? (
            <EmptyState text="No pending requests right now. New bookings will appear here the instant a customer submits one." />
          ) : (
            <div className="space-y-3">
              {pending.map((b) => (
                <div key={b.id} className="card p-4 sm:flex sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 grid sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="font-medium">{b.customer_name}</p>
                      <p className="text-harbor-900/50">{b.passenger_count} passenger(s)</p>
                    </div>
                    <div>
                      <p className="text-harbor-900/50 text-xs">Pickup</p>
                      <p>{b.pickup_location}</p>
                    </div>
                    <div>
                      <p className="text-harbor-900/50 text-xs">Destination</p>
                      <p>{b.destination}</p>
                    </div>
                    <div>
                      <p className="text-harbor-900/50 text-xs">When</p>
                      <p>{b.pickup_date} · {b.pickup_time}</p>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex items-center gap-2">
                    <select
                      className="field-input w-44"
                      defaultValue=""
                      onChange={(e) => e.target.value && assignDriver(b.id, e.target.value)}
                      disabled={assigning?.bookingId === b.id}
                    >
                      <option value="" disabled>
                        Assign driver…
                      </option>
                      {drivers
                        .filter((d) => d.status === "AVAILABLE")
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Active rides ({active.length})</h2>
          {loading ? (
            <SkeletonRows />
          ) : active.length === 0 ? (
            <EmptyState text="No rides in progress. Assigned and en-route rides will show up here." />
          ) : (
            <div className="space-y-3">
              {active.map((b) => {
                const driver = b.driver_id ? driverById.get(b.driver_id) : null;
                return (
                  <div key={b.id} className="card p-4 sm:flex sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 grid sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="font-medium">{b.customer_name}</p>
                        <p className="text-harbor-900/50">{driver?.name ?? "Unassigned"}</p>
                      </div>
                      <div>
                        <p className="text-harbor-900/50 text-xs">Pickup</p>
                        <p>{b.pickup_location}</p>
                      </div>
                      <div>
                        <p className="text-harbor-900/50 text-xs">Destination</p>
                        <p>{b.destination}</p>
                      </div>
                      <div>
                        <StatusBadge status={b.status} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Completed & cancelled ({history.length})</h2>
          {loading ? null : history.length === 0 ? (
            <EmptyState text="Finished rides will be listed here." />
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((b) => (
                <div key={b.id} className="card p-3 flex items-center justify-between text-sm">
                  <span>
                    {b.customer_name} — {b.pickup_location} → {b.destination}
                  </span>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="card p-6 text-sm text-harbor-900/60">{text}</div>;
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="card p-4 h-16 animate-pulse bg-harbor-900/5" />
      ))}
    </div>
  );
}
