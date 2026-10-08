import { api } from '../lib/api';

export type OwnerDashboardResponse = {
  date: string;

  summary: {
    reservations: number;
    active_reservations: number;
    staff_users: number;
    occupied_tables: number;
    available_tables: number;
    waiting_queue: number;
  };

  tasks: {
    upcoming_reservations_next_hour: number;
    waiting_parties: number;
    tables_needing_cleaning: number;
  };

  queue: {
    waiting: number;
    total_today: number;
  };

  tables: {
    total: number;
    available: number;
    occupied: number;
    cleaning: number;
    reserved: number;
    unavailable: number;
  };

  updated_at: string;
};

export type OwnerAnalyticsResponse = {
  date: string;

  reservations: {
    total: number;
    active: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
    total_guests: number;
  };

  queue: {
    total: number;
    total_guests: number;
    waiting: number;
    served: number;
    no_show: number;
    average_wait_minutes: number;
    longest_wait_minutes: number;
  };

  tables: {
    total: number;
    available: number;
    occupied: number;
    cleaning: number;
    reserved: number;
    unavailable: number;
    utilization_percent: number;
  };

  hourly_demand: Array<{
    hour: number;
    reservations: number;
    guests: number;
  }>;

  comparison: {
    previous_day_reservations: number;
    reservation_change_percent: number;
  };

  updated_at: string;
};

export function getOwnerDashboard(
  restaurantId: string
) {
  return api<OwnerDashboardResponse>(
    `/dashboard/${restaurantId}`
  );
}

export function getOwnerAnalytics(
  restaurantId: string,
  date?: string
) {
  const query = date
    ? `?date=${encodeURIComponent(date)}`
    : '';

  return api<OwnerAnalyticsResponse>(
    `/analytics/${restaurantId}${query}`
  );
}