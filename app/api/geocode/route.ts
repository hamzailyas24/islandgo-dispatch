import { NextRequest, NextResponse } from "next/server";
import { matchKnownLocation } from "@/lib/geocoding";

// Simple in-memory cache + rate limit for the demo. Nominatim's usage
// policy asks for max 1 request/second and a descriptive User-Agent
// (https://operations.osmfoundation.org/policies/nominatim/) — both are
// handled here. For anything beyond a small demo, swap this for a paid/
// self-hosted geocoder with a proper cache layer (e.g. Redis).
const cache = new Map<string, { lat: number; lon: number } | null>();
let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1100;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing ?q= query." }, { status: 400 });
  }

  const known = matchKnownLocation(query);
  if (known) {
    return NextResponse.json({ lat: known.lat, lon: known.lon, source: "known" });
  }

  const cacheKey = query.toLowerCase();
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    return cached
      ? NextResponse.json({ ...cached, source: "cache" })
      : NextResponse.json({ error: "No match found for that location." }, { status: 404 });
  }

  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    // Bias results toward Sint Maarten / St. Martin for this demo.
    url.searchParams.set("countrycodes", "sx,mf");

    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a descriptive User-Agent identifying the app.
        "User-Agent": "IslandGoDispatchPrototype/0.1 (demo proof-of-concept)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding service is unavailable." }, { status: 502 });
    }

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) {
      cache.set(cacheKey, null);
      return NextResponse.json({ error: "No match found for that location." }, { status: 404 });
    }

    const coords = { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
    cache.set(cacheKey, coords);
    return NextResponse.json({ ...coords, source: "nominatim" });
  } catch (err) {
    console.error("Geocoding request failed:", err);
    return NextResponse.json({ error: "Could not reach the geocoding service." }, { status: 502 });
  }
}
