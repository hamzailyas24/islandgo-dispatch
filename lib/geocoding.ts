export interface Coordinates {
  lat: number;
  lon: number;
}

// Coordinates for the demo locations used throughout the seed data and the
// scripted demo flow. Matching against these first means the map in the
// booking form, admin dashboard, and driver dashboard resolves instantly
// and reliably for the demo, without depending on an external geocoding
// call every time. Anything that doesn't match falls back to OpenStreetMap
// Nominatim (see /api/geocode) so real addresses still work.
export const KNOWN_LOCATIONS: Record<string, Coordinates> = {
  "princess juliana international airport": { lat: 18.0410, lon: -63.1089 },
  "pjia": { lat: 18.0410, lon: -63.1089 },
  "philipsburg": { lat: 18.0237, lon: -63.0458 },
  "marigot": { lat: 18.0731, lon: -63.0822 },
  "simpson bay": { lat: 18.0333, lon: -63.1167 },
  "maho": { lat: 18.0447, lon: -63.1170 },
};

export function matchKnownLocation(query: string): Coordinates | null {
  const key = query.trim().toLowerCase();
  if (KNOWN_LOCATIONS[key]) return KNOWN_LOCATIONS[key];
  // Loose contains-match, e.g. "Simpson Bay, near the marina"
  for (const [name, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (key.includes(name)) return coords;
  }
  return null;
}
