import type { BookingStatus } from "@/lib/types";

const LABELS: Record<BookingStatus, string> = {
  PENDING: "Waiting for a driver",
  ASSIGNED: "Driver assigned",
  ACCEPTED: "Driver on the way",
  EN_ROUTE: "En route to pickup",
  ARRIVED: "Driver has arrived",
  COMPLETED: "Ride completed",
  CANCELLED: "Cancelled",
};

const DOT_COLOR: Record<BookingStatus, string> = {
  PENDING: "bg-status-pending",
  ASSIGNED: "bg-status-assigned",
  ACCEPTED: "bg-status-accepted",
  EN_ROUTE: "bg-status-enroute",
  ARRIVED: "bg-status-arrived",
  COMPLETED: "bg-status-completed",
  CANCELLED: "bg-status-cancelled",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-harbor-900/10 bg-harbor-900/[0.03] px-2.5 py-1 text-xs font-medium text-harbor-900">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR[status]}`} />
      {LABELS[status]}
    </span>
  );
}
