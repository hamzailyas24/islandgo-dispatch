import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { DRIVER_STATUS_FLOW, type BookingStatus } from "@/lib/types";

const VALID_STATUSES: BookingStatus[] = [
  "PENDING",
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "COMPLETED",
  "CANCELLED",
];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "driver" || !session.driverId) {
    return NextResponse.json({ error: "Driver sign-in required." }, { status: 401 });
  }

  const bookingId = params.id;
  const { status: nextStatus } = await req.json();
  if (!VALID_STATUSES.includes(nextStatus)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }

  const { data: booking, error: bookingError } = await supabaseServer
    .from("bookings")
    .select("id, status, driver_id")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking was not found." }, { status: 404 });
  }

  // A driver can only ever move their own assigned ride — the driver id
  // comes from the signed session, never from the request body.
  if (booking.driver_id !== session.driverId) {
    return NextResponse.json({ error: "This ride is not assigned to you." }, { status: 403 });
  }

  const allowedNext = DRIVER_STATUS_FLOW[booking.status as BookingStatus] || [];
  if (!allowedNext.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Can't move a ${booking.status} ride directly to ${nextStatus}.` },
      { status: 409 }
    );
  }

  const { data: updatedBooking, error: updateError } = await supabaseServer
    .from("bookings")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", booking.status) // optimistic concurrency guard
    .select()
    .single();

  if (updateError || !updatedBooking) {
    return NextResponse.json({ error: "Could not update the ride. Please try again." }, { status: 500 });
  }

  // Free the driver back up once the ride ends, so admin sees them as
  // available for the next dispatch.
  if (nextStatus === "COMPLETED" || nextStatus === "CANCELLED") {
    await supabaseServer.from("drivers").update({ status: "AVAILABLE" }).eq("id", session.driverId);
  }

  await recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: "booking.status_change",
    entityType: "booking",
    entityId: bookingId,
    before: { status: booking.status },
    after: { status: nextStatus },
  });

  return NextResponse.json({ booking: updatedBooking });
}
