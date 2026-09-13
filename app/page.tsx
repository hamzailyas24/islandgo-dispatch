"use client";

import { useState } from "react";
import Link from "next/link";

interface FormState {
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  destination: string;
  passenger_count: string;
  pickup_date: string;
  pickup_time: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  customer_name: "",
  customer_phone: "",
  pickup_location: "",
  destination: "",
  passenger_count: "1",
  pickup_date: "",
  pickup_time: "",
  notes: "",
};

export default function BookingPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, passenger_count: Number(form.passenger_count) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.");
        setFieldErrors(data.fields || {});
        return;
      }
      setConfirmedId(data.booking.id);
      setForm(EMPTY_FORM);
    } catch {
      setSubmitError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-harbor-950">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-lagoon-300/30 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1FA7A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Your ride request is in</h1>
          <p className="text-sm text-harbor-900/70 mb-1">
            Booking reference <span className="font-mono text-harbor-900">{confirmedId.slice(0, 8)}</span>
          </p>
          <p className="text-sm text-harbor-900/70 mb-6">
            Dispatch has your request. You'll be assigned a driver shortly — no need to refresh anything.
          </p>
          <button className="btn-primary w-full" onClick={() => setConfirmedId(null)}>
            Book another ride
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-harbor-950">
      <header className="max-w-2xl mx-auto px-4 pt-10 pb-6 flex items-center justify-between">
        <div>
          <p className="text-lagoon-300 text-sm font-medium">IslandGo</p>
          <h1 className="text-2xl font-semibold text-white">Book an IslandCab</h1>
        </div>
        <Link href="/login" className="text-sm text-white/60 hover:text-white transition">
          Dispatch sign in
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-5" noValidate>
          {submitError && (
            <div className="rounded-xl bg-status-cancelled/10 border border-status-cancelled/30 px-4 py-3 text-sm text-status-cancelled">
              {submitError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="customer_name">Full name</label>
              <input
                id="customer_name"
                className="field-input"
                value={form.customer_name}
                onChange={(e) => update("customer_name", e.target.value)}
                placeholder="John Smith"
                required
              />
              {fieldErrors.customer_name && <p className="field-error">{fieldErrors.customer_name}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="customer_phone">Phone number</label>
              <input
                id="customer_phone"
                className="field-input"
                value={form.customer_phone}
                onChange={(e) => update("customer_phone", e.target.value)}
                placeholder="+1 721 555 0134"
                required
              />
              {fieldErrors.customer_phone && <p className="field-error">{fieldErrors.customer_phone}</p>}
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="pickup_location">Pickup location</label>
            <input
              id="pickup_location"
              className="field-input"
              value={form.pickup_location}
              onChange={(e) => update("pickup_location", e.target.value)}
              placeholder="Princess Juliana International Airport"
              required
            />
            {fieldErrors.pickup_location && <p className="field-error">{fieldErrors.pickup_location}</p>}
          </div>

          <div>
            <label className="field-label" htmlFor="destination">Destination</label>
            <input
              id="destination"
              className="field-input"
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              placeholder="Philipsburg"
              required
            />
            {fieldErrors.destination && <p className="field-error">{fieldErrors.destination}</p>}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="field-label" htmlFor="passenger_count">Passengers</label>
              <input
                id="passenger_count"
                type="number"
                min={1}
                max={12}
                className="field-input"
                value={form.passenger_count}
                onChange={(e) => update("passenger_count", e.target.value)}
                required
              />
              {fieldErrors.passenger_count && <p className="field-error">{fieldErrors.passenger_count}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="pickup_date">Pickup date</label>
              <input
                id="pickup_date"
                type="date"
                className="field-input"
                value={form.pickup_date}
                onChange={(e) => update("pickup_date", e.target.value)}
                required
              />
              {fieldErrors.pickup_date && <p className="field-error">{fieldErrors.pickup_date}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="pickup_time">Pickup time</label>
              <input
                id="pickup_time"
                type="time"
                className="field-input"
                value={form.pickup_time}
                onChange={(e) => update("pickup_time", e.target.value)}
                required
              />
              {fieldErrors.pickup_time && <p className="field-error">{fieldErrors.pickup_time}</p>}
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              className="field-input min-h-[84px]"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Extra luggage, child seat, flight number…"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Requesting your ride…" : "Request ride"}
          </button>
        </form>
      </div>
    </main>
  );
}
