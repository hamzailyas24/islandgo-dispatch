"use client";

import dynamic from "next/dynamic";
import type { RideMapProps } from "./RideMapClient";

const RideMapClient = dynamic(() => import("./RideMapClient"), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-harbor-900/5 animate-pulse" />,
});

export default function RideMap(props: RideMapProps) {
  return <RideMapClient {...props} />;
}
