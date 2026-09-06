import { claimPlots, findPlot, plotFits } from "./lot";
import type { OrderStatus, Snapshot, Stall, Venue } from "./types";

/**
 * Pure snapshot transitions for the rules the business depends on: daily
 * sign-up before the cutoff, releasing a no-show's plot back to the waitlist,
 * the licence gate on mini-program ordering, and the order lifecycle.
 *
 * Every function returns the snapshot unchanged when the move is not allowed,
 * so callers can hand the result straight to a state setter.
 */

function allocate(stalls: Stall[], venue: Venue): Stall[] {
  return claimPlots(stalls, venue);
}

function reallocate(s: Snapshot, venue: Venue, stalls: Stall[]): Snapshot {
  return { ...s, stalls: allocate(stalls, venue) };
}

function context(s: Snapshot, stallId: string) {
  const stall = s.stalls.find((row) => row.id === stallId);
  const venue = s.venues.find((v) => v.id === stall?.venueId);
  return stall && venue ? { stall, venue } : null;
}

const CLEARED = {
  signedUpToday: false,
  allottedToday: false,
  signedUpAt: 0,
  arrivedToday: false,
  lotSlot: 0,
  lotPlotId: "",
} as const;

/** Sign a stall up for tonight. Refused once the venue's cutoff has passed. */
export function signUp(s: Snapshot, stallId: string, plotId: string | undefined, now: number): Snapshot {
  const found = context(s, stallId);
  if (!found) return s;
  const { stall, venue } = found;
  if (!venue.signupOpen || stall.status !== "active") return s;
  const plot = plotId ? findPlot(venue.floor, plotId) : findPlot(venue.floor, stall.lotPlotId);
  if (plotId && (!plot || !plotFits(stall.category, plot))) return s;
  const stalls = s.stalls.map((row) =>
    row.id === stallId
      ? {
          ...row,
          signedUpToday: true,
          signedUpAt: row.signedUpAt || now,
          lotPlotId: plot?.id || row.lotPlotId,
          lotSlot: plot ? Number(plot.no) : row.lotSlot,
        }
      : row,
  );
  return reallocate(s, venue, stalls);
}

/** Withdraw tonight's sign-up. Also refused after the cutoff. */
export function withdraw(s: Snapshot, stallId: string): Snapshot {
  const found = context(s, stallId);
  if (!found || !found.venue.signupOpen) return s;
  const stalls = s.stalls.map((row) => (row.id === stallId ? { ...row, ...CLEARED } : row));
  return reallocate(s, found.venue, stalls);
}

/**
 * Release a no-show's plot. Refused while the stall still has an unfinished
 * order, so a customer who has paid never loses the stall they ordered from.
 * The freed plot is re-allocated, which is what promotes the waitlist.
 */
export function markNoShow(s: Snapshot, stallId: string): Snapshot {
  const found = context(s, stallId);
  if (!found || !found.stall.allottedToday) return s;
  const live = s.orders.some(
    (row) => row.stallId === stallId && (row.status === "placed" || row.status === "ready"),
  );
  if (live) return s;
  const stalls = s.stalls.map((row) =>
    row.id === stallId ? { ...row, ...CLEARED, noShowToday: true } : row,
  );
  return reallocate(s, found.venue, stalls);
}

/** Advance an order. Only placed to ready, and ready to picked, are legal. */
export function markOrder(s: Snapshot, orderId: string, status: OrderStatus): Snapshot {
  const current = s.orders.find((row) => row.id === orderId);
  if (!current) return s;
  const allowed =
    (current.status === "placed" && status === "ready") || (current.status === "ready" && status === "picked");
  if (!allowed) return s;
  return { ...s, orders: s.orders.map((row) => (row.id === orderId ? { ...row, status } : row)) };
}

/** Refund an order. Refused once it has been collected or already refunded. */
export function refundOrder(s: Snapshot, orderId: string): Snapshot {
  const current = s.orders.find((row) => row.id === orderId);
  if (!current || current.status === "picked" || current.status === "refunded") return s;
  return {
    ...s,
    orders: s.orders.map((row) => (row.id === orderId ? { ...row, status: "refunded" as const } : row)),
  };
}

/** Close sign-up for the day and settle the final allocation. */
export function closeSignup(s: Snapshot, venueId: string): Snapshot {
  const venue = s.venues.find((v) => v.id === venueId);
  if (!venue) return s;
  return {
    ...s,
    venues: s.venues.map((v) => (v.id === venueId ? { ...v, signupOpen: false } : v)),
    stalls: allocate(s.stalls, venue),
  };
}

/** Roll over to the next trading day: everyone starts unsigned again. */
export function openNextDay(s: Snapshot, venueId: string): Snapshot {
  return {
    ...s,
    venues: s.venues.map((v) => (v.id === venueId ? { ...v, signupOpen: true, closedToday: false } : v)),
    stalls: s.stalls.map((row) =>
      row.venueId === venueId ? { ...row, ...CLEARED, noShowToday: false } : row,
    ),
  };
}
