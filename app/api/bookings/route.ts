import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    customer_name,
    customer_phone,
    pickup_location,
    destination,
    passenger_count,
    pickup_date,
    pickup_time,
    notes,
  } = body;

  const errors: Record<string, string> = {};
  if (!isNonEmptyString(customer_name)) errors.customer_name = "Customer name is required.";
  if (!isNonEmptyString(customer_phone)) errors.customer_phone = "Phone number is required.";
  if (!isNonEmptyString(pickup_location)) errors.pickup_location = "Pickup location is required.";
  if (!isNonEmptyString(destination)) errors.destination = "Destination is required.";
  if (!isNonEmptyString(pickup_date)) errors.pickup_date = "Pickup date is required.";
  if (!isNonEmptyString(pickup_time)) errors.pickup_time = "Pickup time is required.";

  const passengers = Number(passenger_count);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 12) {
    errors.passenger_count = "Passenger count must be a whole number between 1 and 12.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fields: errors }, { status: 422 });
  }

  const { data, error } = await supabaseServer
    .from("bookings")
    .insert({
      customer_name: (customer_name as string).trim(),
      customer_phone: (customer_phone as string).trim(),
      pickup_location: (pickup_location as string).trim(),
      destination: (destination as string).trim(),
      passenger_count: passengers,
      pickup_date,
      pickup_time,
      notes: isNonEmptyString(notes) ? (notes as string).trim() : null,
      status: "PENDING",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json({ error: "Could not create the booking. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ booking: data }, { status: 201 });
}
