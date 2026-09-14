"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Coordinates } from "@/lib/geocoding";

// Leaflet's default marker icons reference image files that don't survive
// Next.js bundling out of the box. Rather than fight the asset pipeline,
// we build small colored div-icons in code — no external image assets, no
// broken marker glyphs.
function dotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const pickupIcon = dotIcon("#1FA7A0"); // lagoon
const destinationIcon = dotIcon("#E4633B"); // coral

function FitBounds({ points }: { points: Coordinates[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, points]);
  return null;
}

export interface RideMapProps {
  pickup?: Coordinates | null;
  pickupLabel?: string;
  destination?: Coordinates | null;
  destinationLabel?: string;
  className?: string;
}

export default function RideMapClient({ pickup, pickupLabel, destination, destinationLabel, className }: RideMapProps) {
  const points = [pickup, destination].filter(Boolean) as Coordinates[];
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lon] : [18.0405, -63.0548]; // St. Maarten

  if (points.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-harbor-900/5 text-sm text-harbor-900/50 rounded-xl ${className ?? "h-48"}`}>
        Enter a pickup and destination to preview the route
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-harbor-900/10 ${className ?? "h-48"}`}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Standard OpenStreetMap tile server — attribution is required and
            included below per OSM's usage policy. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickup && (
          <Marker position={[pickup.lat, pickup.lon]} icon={pickupIcon}>
            <Popup>Pickup — {pickupLabel}</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lon]} icon={destinationIcon}>
            <Popup>Destination — {destinationLabel}</Popup>
          </Marker>
        )}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
