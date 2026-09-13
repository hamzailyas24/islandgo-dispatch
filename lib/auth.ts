import "server-only";
import { cookies } from "next/headers";
import { verifySessionCookieValue, SESSION_COOKIE_NAME, type Session } from "@/lib/session";

export async function getSession(): Promise<Session | null> {
  const raw = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookieValue(raw);
}

export { SESSION_COOKIE_NAME };
export type { Session };
