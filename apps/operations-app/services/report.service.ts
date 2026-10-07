import {
  queueRecords,
  reservationRecords,
  tableUsageRecords,
  walkInRecords,
} from '../utils/mockData';

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

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const isWithinRange = (
  date: string,
  start: string,
  end: string
) => {
  return date >= start && date <= end;
};

export function generateOwnerReport(
  period: ReportPeriod
): OwnerReport {
  const reservations = reservationRecords.filter((r) =>
    isWithinRange(r.date, period.start, period.end)
  );

  const walkIns = walkInRecords.filter((r) =>
    isWithinRange(r.date, period.start, period.end)
  );

  const queue = queueRecords.filter((r) =>
    isWithinRange(r.date, period.start, period.end)
  );

  const tables = tableUsageRecords.filter((r) =>
    isWithinRange(r.date, period.start, period.end)
  );

  const reservationGuests = reservations.reduce(
    (sum, r) => sum + r.guests,
    0
  );

  const walkInGuests = walkIns.reduce(
    (sum, r) => sum + r.guests,
    0
  );

  const servedQueue = queue.filter(
    (r) => r.status === 'Served'
  );

  const averageWait = servedQueue.length
    ? servedQueue.reduce(
        (sum, r) => sum + r.waitMinutes,
        0
      ) / servedQueue.length
    : 0;

  const longestWait = queue.length
    ? Math.max(...queue.map((r) => r.waitMinutes))
    : 0;

  return {
    period,

    reservations: {
      total: reservations.length,

      confirmed: reservations.filter(
        (r) => r.status === 'Confirmed'
      ).length,

      completed: reservations.filter(
        (r) => r.status === 'Completed'
      ).length,

      cancelled: reservations.filter(
        (r) => r.status === 'Cancelled'
      ).length,

      noShow: reservations.filter(
        (r) => r.status === 'No-show'
      ).length,

      guests: reservationGuests,

      averageGuests: reservations.length
        ? round(
            reservationGuests / reservations.length
          )
        : 0,
    },

    walkIns: {
      total: walkIns.length,

      served: walkIns.filter(
        (r) => r.status === 'Served'
      ).length,

      waiting: walkIns.filter(
        (r) => r.status === 'Waiting'
      ).length,

      noShow: walkIns.filter(
        (r) => r.status === 'No-show'
      ).length,

      guests: walkInGuests,

      averageGuests: walkIns.length
        ? round(
            walkInGuests / walkIns.length
          )
        : 0,
    },

    queue: {
      total: queue.length,

      served: servedQueue.length,

      waiting: queue.filter(
        (r) => r.status === 'Waiting'
      ).length,

      noShow: queue.filter(
        (r) => r.status === 'No-show'
      ).length,

      averageWaitMinutes: round(averageWait),

      longestWaitMinutes: longestWait,
    },

    tables: {
      averageOccupied: tables.length
        ? round(
            tables.reduce(
              (sum, r) => sum + r.occupiedTables,
              0
            ) / tables.length
          )
        : 0,

      averageUtilization: tables.length
        ? round(
            tables.reduce(
              (sum, r) => sum + r.utilizationPercent,
              0
            ) / tables.length
          )
        : 0,
    },
  };
}