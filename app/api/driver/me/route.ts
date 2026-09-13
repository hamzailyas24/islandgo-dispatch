import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "driver" || !session.driverId) {
    return NextResponse.json({ error: "Not signed in as a driver." }, { status: 401 });
  }
  return NextResponse.json({ driverId: session.driverId, driverName: session.driverName });
}
