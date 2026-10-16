export interface Product {
  id: number;
  sku?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  price: string;
  cost?: string | null;
  stock: number;
  minStock: number;
  imageUrl?: string | null;
  active: boolean;
}

export interface ServiceItem {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  durationMinutes: number;
  active: boolean;
}

export interface Appointment {
  id: number;
  customerName: string;
  customerPhone?: string | null;
  barberId?: number | null;
  serviceId?: number | null;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes?: string | null;
}

export interface ScheduleDay {
  id: number;
  weekday: number;
  isWorking: boolean;
  openTime: string;
  closeTime: string;
  slotDurationMinutes: number;
}

export interface Holiday {
  id: number;
  date: string;
  reason: string;
  recurringYearly: boolean;
}

export interface Sale {
  id: number;
  customerName?: string | null;
  total: string;
  status: string;
  paymentMethod?: string | null;
  createdAt?: string;
}

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface PageParams {
  page: number;
  limit: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
