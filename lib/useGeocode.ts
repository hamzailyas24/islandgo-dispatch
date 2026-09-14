"use client";

import { useEffect, useRef, useState } from "react";
import type { Coordinates } from "@/lib/geocoding";
import { matchKnownLocation } from "@/lib/geocoding";

/**
 * Resolves a free-text location string to coordinates, debounced so we
 * don't fire a request on every keystroke. Known demo locations (PJIA,
 * Philipsburg, Marigot, Simpson Bay, Maho) resolve instantly and locally;
 * anything else is debounced out to /api/geocode (OpenStreetMap Nominatim).
 */
export function useGeocode(query: string, delayMs = 600) {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setCoords(null);
      return;
    }

    const known = matchKnownLocation(trimmed);
    if (known) {
      setCoords(known);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
        if (id !== requestId.current) return; // a newer query has since started
        if (!res.ok) {
          setCoords(null);
          return;
        }
        const data = await res.json();
        setCoords({ lat: data.lat, lon: data.lon });
      } catch {
        if (id === requestId.current) setCoords(null);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [query, delayMs]);

  return { coords, loading };
}
