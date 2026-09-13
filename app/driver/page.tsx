"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking, BookingStatus } from "@/lib/types";

const NEXT_ACTION: Partial<Record<BookingStatus, { label: string; next: BookingStatus }>> = {
  ASSIGNED: { label: "Accept ride", next: "ACCEPTED" },
  ACCEPTED: { label: "Start driving (en route)", next: "EN_ROUTE" },
  EN_ROUTE: { label: "Mark arrived", next: "ARRIVED" },
  ARRIVED: { label: "Complete ride", next: "COMPLETED" },
};

export default function DriverDashboard() {
  const router = useRouter();
  const [rides, setRides] = useState<Booking[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    const meRes = await fetch("/api/driver/me");
    if (!meRes.ok) {
      router.push("/login");
      return;
    }
    const me = await meRes.json();
    setDriverId(me.driverId);

    const { data, error } = await supabaseBrowser
      .from("bookings")
      .select("*")
      .eq("driver_id", me.driverId)
      .not("status", "in", "(COMPLETED,CANCELLED)")
      .order("created_at", { ascending: true });

    if (!error) setRides((data as Booking[]) || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!driverId) return;
    const channel = supabaseBrowser
      .channel(`driver-${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `driver_id=eq.${driverId}` },
        (payload) => {
          setRides((prev) => {
            const incoming = (payload.new || payload.old) as Booking;
            if (payload.eventType === "DELETE") {
              return prev.filter((r) => r.id !== incoming.id);
            }
            const updated = payload.new as Booking;
            if (["COMPLETED", "CANCELLED"].includes(updated.status)) {
              return prev.filter((r) => r.id !== updated.id);
            }
            const exists = prev.some((r) => r.id === updated.id);
            return exists ? prev.map((r) => (r.id === updated.id ? updated : r)) : [...prev, updated];
          });
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [driverId]);

  async function updateStatus(bookingId: string, nextStatus: BookingStatus) {
    setUpdating(bookingId);
    setBanner(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Could not update the ride." });
        return;
      }
      setBanner({ type: "success", text: "Updated. Admin sees this instantly." });
    } catch {
      setBanner({ type: "error", text: "Network error while updating the ride." });
    } finally {
      setUpdating(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-sand-200">
      <header className="bg-harbor-950 text-white sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-lagoon-300 text-xs font-medium">IslandGo Dispatch</p>
            <h1 className="text-lg font-semibold">My rides</h1>
          </div>
          <button onClick={logout} className="text-sm text-white/70 hover:text-white">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
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

        {loading ? (
          <div className="card p-4 h-40 animate-pulse bg-harbor-900/5" />
        ) : rides.length === 0 ? (
          <div className="card p-6 text-sm text-harbor-900/60 text-center">
            No rides assigned right now. New assignments will appear here instantly.
          </div>
        ) : (
          rides.map((ride) => {
            const action = NEXT_ACTION[ride.status];
            return (
              <div key={ride.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{ride.customer_name}</p>
                    <a href={`tel:${ride.customer_phone}`} className="text-sm text-lagoon-500 underline">
                      {ride.customer_phone}
                    </a>
                  </div>
                  <StatusBadge status={ride.status} />
                </div>

                <dl className="text-sm space-y-1.5 mb-4">
                  <div className="flex gap-2">
                    <dt className="text-harbor-900/50 w-24 shrink-0">Pickup</dt>
                    <dd>{ride.pickup_location}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-harbor-900/50 w-24 shrink-0">Destination</dt>
                    <dd>{ride.destination}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-harbor-900/50 w-24 shrink-0">Passengers</dt>
                    <dd>{ride.passenger_count}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-harbor-900/50 w-24 shrink-0">Pickup time</dt>
                    <dd>{ride.pickup_date} · {ride.pickup_time}</dd>
                  </div>
                  {ride.notes && (
                    <div className="flex gap-2">
                      <dt className="text-harbor-900/50 w-24 shrink-0">Notes</dt>
                      <dd>{ride.notes}</dd>
                    </div>
                  )}
                </dl>

                {action && (
                  <button
                    onClick={() => updateStatus(ride.id, action.next)}
                    disabled={updating === ride.id}
                    className="btn-primary w-full"
                  >
                    {updating === ride.id ? "Updating…" : action.label}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
