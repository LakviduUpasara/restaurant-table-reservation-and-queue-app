import { api } from '../lib/api';

export type ReportPeriod = {
  start: string;
  end: string;
  label: string;
};

export type OwnerReport = {
  period: ReportPeriod;

  reservations: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    guests: number;
    averageGuests: number;
  };

  walkIns: {
    total: number;
    served: number;
    waiting: number;
    noShow: number;
    guests: number;
    averageGuests: number;
  };

  queue: {
    total: number;
    served: number;
    waiting: number;
    noShow: number;
    averageWaitMinutes: number;
    longestWaitMinutes: number;
  };

  tables: {
    averageOccupied: number;
    averageUtilization: number;
  };
};

export type BackendReport = {
  period: 'today' | '7d' | '30d' | 'custom'; from: string; to: string; generated_at: string;
  reservations: { total: number; confirmed: number; completed: number; cancelled: number; no_show: number; guests: number; average_guests: number };
  walk_ins: { total: number; served: number; waiting: number; no_show: number; guests: number; average_guests: number };
  queue: { total: number; served: number; waiting: number; no_show: number; average_wait_minutes: number; longest_wait_minutes: number };
  tables: { average_occupied: number; average_utilization: number };
};

function reportQuery(period: ReportPeriod) {
  if (period.label === 'Today') return '?period=today';
  if (period.label === '7 Days') return '?period=7d';
  if (period.label === '30 Days') return '?period=30d';
  return `?period=custom&from=${encodeURIComponent(period.start)}&to=${encodeURIComponent(period.end)}`;
}

export async function getOwnerReport(restaurantId: string, period: ReportPeriod): Promise<OwnerReport> {
  const result = await api<BackendReport>(`/owner/reports/${restaurantId}${reportQuery(period)}`);
  return {
    period: { start: result.from, end: result.to, label: period.label },
    reservations: { total: result.reservations.total, confirmed: result.reservations.confirmed, completed: result.reservations.completed, cancelled: result.reservations.cancelled, noShow: result.reservations.no_show, guests: result.reservations.guests, averageGuests: result.reservations.average_guests },
    walkIns: { total: result.walk_ins.total, served: result.walk_ins.served, waiting: result.walk_ins.waiting, noShow: result.walk_ins.no_show, guests: result.walk_ins.guests, averageGuests: result.walk_ins.average_guests },
    queue: { total: result.queue.total, served: result.queue.served, waiting: result.queue.waiting, noShow: result.queue.no_show, averageWaitMinutes: result.queue.average_wait_minutes, longestWaitMinutes: result.queue.longest_wait_minutes },
    tables: { averageOccupied: result.tables.average_occupied, averageUtilization: result.tables.average_utilization },
  };
}
