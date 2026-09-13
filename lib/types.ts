export type BookingStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED";

export type DriverStatus = "AVAILABLE" | "BUSY" | "OFFLINE";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  created_at: string;
}

export interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  destination: string;
  passenger_count: number;
  pickup_date: string;
  pickup_time: string;
  notes: string | null;
  status: BookingStatus;
  driver_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithDriver extends Booking {
  driver: Pick<Driver, "id" | "name" | "phone" | "status"> | null;
}

// Allowed forward transitions — enforced server-side so a client can never
// skip a step or move a booking backwards.
export const DRIVER_STATUS_FLOW: Record<BookingStatus, BookingStatus[]> = {
  PENDING: [],
  ASSIGNED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["ARRIVED"],
  ARRIVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};
