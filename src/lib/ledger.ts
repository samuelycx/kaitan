import { monthOf } from "./types";
import type { DayRecord, Stall } from "./types";

/**
 * The three questions the organizer has to answer every month, worked out from
 * the filed trading days alone. Kept separate from React so the numbers can be
 * checked without a browser.
 */

export type Attendance = {
  stallId: string;
  vendorName: string;
  /** Days the stall was there and trading. */
  days: number;
  /** Days it took a plot and never turned up. */
  noShows: number;
  /** Days it signed up and lost out, which is not the vendor's fault. */
  waitlisted: number;
  salesYuan: number;
};

/** Attendance for one month, worst offenders first — that is what gets acted on. */
export function attendance(log: DayRecord[], venueId: string, month: string, stalls: Stall[]): Attendance[] {
  const rows = log.filter((row) => row.venueId === venueId && monthOf(row.date) === month);
  return stalls
    .filter((s) => s.venueId === venueId && s.status === "active")
    .map((s) => {
      const mine = rows.filter((row) => row.stallId === s.id);
      return {
        stallId: s.id,
        vendorName: s.vendorName,
        days: mine.filter((row) => row.arrived).length,
        noShows: mine.filter((row) => row.noShow || (row.allotted && !row.arrived)).length,
        waitlisted: mine.filter((row) => row.signedUp && !row.allotted && !row.noShow).length,
        salesYuan: mine.reduce((sum, row) => sum + row.salesYuan, 0),
      };
    })
    .sort((a, b) => b.noShows - a.noShows || b.days - a.days);
}

export type DayOccupancy = {
  date: string;
  taken: number;
  arrived: number;
  vacant: number;
};

/** The last `days` filed trading days at a venue, newest first. */
export function occupancy(log: DayRecord[], venueId: string, days = 7): DayOccupancy[] {
  const byDate = new Map<string, DayRecord[]>();
  for (const row of log) {
    if (row.venueId !== venueId) continue;
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, days)
    .map(([date, rows]) => {
      const taken = rows.filter((row) => row.allotted).length;
      const plots = rows[0]?.plotsThatDay ?? 0;
      return {
        date,
        taken,
        arrived: rows.filter((row) => row.arrived).length,
        vacant: Math.max(0, plots - taken),
      };
    });
}

/** Averages over those days, which is the line the organizer reports upward. */
export function occupancyAverage(rows: DayOccupancy[]) {
  if (rows.length === 0) return { days: 0, taken: 0, vacant: 0, arrived: 0 };
  const round = (n: number) => Math.round((n / rows.length) * 10) / 10;
  return {
    days: rows.length,
    taken: round(rows.reduce((sum, row) => sum + row.taken, 0)),
    vacant: round(rows.reduce((sum, row) => sum + row.vacant, 0)),
    arrived: round(rows.reduce((sum, row) => sum + row.arrived, 0)),
  };
}
