import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }

  const bookingId = params.id;
  const { driver_id } = await req.json();
  if (!driver_id || typeof driver_id !== "string") {
    return NextResponse.json({ error: "A driver must be selected." }, { status: 400 });
  }

  // Never trust a client-provided driver id blindly — confirm the driver
  // actually exists and is available before assigning.
  const { data: driver, error: driverError } = await supabaseServer
    .from("drivers")
    .select("id, status")
    .eq("id", driver_id)
    .single();

  if (driverError || !driver) {
    return NextResponse.json({ error: "Selected driver was not found." }, { status: 404 });
  }
  if (driver.status !== "AVAILABLE") {
    return NextResponse.json({ error: "That driver is not available right now." }, { status: 409 });
  }

  const { data: booking, error: bookingError } = await supabaseServer
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking was not found." }, { status: 404 });
  }
  if (booking.status !== "PENDING") {
    return NextResponse.json(
      { error: `Booking is already ${booking.status.toLowerCase()} and can't be reassigned here.` },
      { status: 409 }
    );
  }

  const { data: updatedBooking, error: updateError } = await supabaseServer
    .from("bookings")
    .update({ status: "ASSIGNED", driver_id, updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "PENDING") // guards against a race with another assignment
    .select()
    .single();

  if (updateError || !updatedBooking) {
    return NextResponse.json({ error: "Could not assign the driver. Please try again." }, { status: 500 });
  }

  await supabaseServer.from("drivers").update({ status: "BUSY" }).eq("id", driver_id);

  return NextResponse.json({ booking: updatedBooking });
}
