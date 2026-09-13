import { NextRequest, NextResponse } from "next/server";
import { createSessionCookieValue, SESSION_COOKIE_NAME, type Session } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const adminUser = process.env.DEMO_ADMIN_USERNAME;
  const adminPass = process.env.DEMO_ADMIN_PASSWORD;
  const driverUser = process.env.DEMO_DRIVER_USERNAME;
  const driverPass = process.env.DEMO_DRIVER_PASSWORD;
  const driverId = process.env.DEMO_DRIVER_ID; // id of the seeded "John Driver" row
  const driverName = process.env.DEMO_DRIVER_NAME || "John Driver";

  let session: Session | null = null;

  if (username === adminUser && password === adminPass) {
    session = { role: "admin" };
  } else if (username === driverUser && password === driverPass) {
    if (!driverId) {
      return NextResponse.json(
        { error: "Demo driver account is not fully configured (missing DEMO_DRIVER_ID)." },
        { status: 500 }
      );
    }
    session = { role: "driver", driverId, driverName };
  }

  if (!session) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ role: session.role });
  res.cookies.set(SESSION_COOKIE_NAME, await createSessionCookieValue(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
