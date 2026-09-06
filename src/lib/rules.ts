import { claimPlots, findPlot, plotFits } from "./lot";
import type { OrderStatus, PlotPreference, Snapshot, Stall, Venue } from "./types";

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
  packedUpToday: false,
  lotSlot: 0,
  lotPlotId: "",
} as const;

/** "15:00" to minutes past midnight. Returns -1 for anything unparseable. */
export function minutesOfClock(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Minutes past midnight right now. The prototype keeps a demo clock so a
 * walkthrough can cross the cutoff without waiting for the real afternoon.
 */
export function nowMinutes(s: Pick<Snapshot, "demoMinutes">, at = Date.now()) {
  if (s.demoMinutes !== null && s.demoMinutes >= 0) return s.demoMinutes;
  const d = new Date(at);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Sign-up is open only while both hold: the printed cutoff has not passed, and
 * the organizer has not closed early. The clock does the closing on its own;
 * the organizer's button can only bring it forward, never push it back.
 */
export function signupOpenNow(s: Snapshot, venue: Venue, at = Date.now()) {
  if (!venue.signupOpen || venue.closedToday) return false;
  const cutoff = minutesOfClock(venue.signupBy);
  if (cutoff < 0) return true;
  return nowMinutes(s, at) < cutoff;
}

/** After the venue's closing time nobody is still trading. */
export function pastClosingTime(s: Snapshot, venue: Venue, at = Date.now()) {
  const close = minutesOfClock(venue.close);
  if (close < 0) return false;
  return nowMinutes(s, at) >= close;
}

/** Sign a stall up for tonight. Refused once the venue's cutoff has passed. */
export function signUp(
  s: Snapshot,
  stallId: string,
  plotId: string | undefined,
  now: number,
  preference?: PlotPreference,
): Snapshot {
  const found = context(s, stallId);
  if (!found) return s;
  const { stall, venue } = found;
  if (!signupOpenNow(s, venue, now) || stall.status !== "active") return s;
  // No plot given means "same as last time" — the one-tap path.
  const wanted = plotId || stall.lotPlotId || stall.lastPlotId;
  const plot = findPlot(venue.floor, wanted);
  if (!plot || !plotFits(stall.category, plot)) return s;
  const stalls = s.stalls.map((row) =>
    row.id === stallId
      ? {
          ...row,
          signedUpToday: true,
          signedUpAt: row.signedUpAt || now,
          lotPlotId: plot.id,
          lotSlot: Number(plot.no),
          plotPreference: preference ?? row.plotPreference,
        }
      : row,
  );
  return reallocate(s, venue, stalls);
}

/** Change the fall-back preference without re-picking a plot. */
export function setPlotPreference(s: Snapshot, stallId: string, preference: PlotPreference): Snapshot {
  const found = context(s, stallId);
  if (!found) return s;
  const stalls = s.stalls.map((row) => (row.id === stallId ? { ...row, plotPreference: preference } : row));
  return reallocate(s, found.venue, stalls);
}

/**
 * Claim a plot that came free after the cutoff. Deliberately never automatic:
 * once sign-up has closed a waitlisted vendor has usually gone home, and
 * handing them a plot they never asked for just creates another empty stall.
 */
export function claimFreedPlot(s: Snapshot, stallId: string, plotId: string): Snapshot {
  const found = context(s, stallId);
  if (!found) return s;
  const { stall, venue } = found;
  if (stall.status !== "active" || !stall.signedUpToday || stall.allottedToday) return s;
  const plot = findPlot(venue.floor, plotId);
  if (!plot || !plotFits(stall.category, plot)) return s;
  const held = s.stalls.some(
    (row) => row.id !== stallId && row.venueId === venue.id && row.allottedToday && row.lotPlotId === plot.id,
  );
  if (held) return s;
  const stalls = s.stalls.map((row) =>
    row.id === stallId ? { ...row, allottedToday: true, lotPlotId: plot.id, lotSlot: Number(plot.no) } : row,
  );
  return { ...s, stalls };
}

/** The vendor says they are set up and trading. */
export function markArrived(s: Snapshot, stallId: string, arrived: boolean): Snapshot {
  const stalls = s.stalls.map((row) =>
    row.id === stallId && row.allottedToday
      ? { ...row, arrivedToday: arrived, packedUpToday: false, noShowToday: arrived ? false : row.noShowToday }
      : row,
  );
  return { ...s, stalls };
}

/**
 * The vendor says they have packed up. Refused while an order is still waiting
 * to be collected, so nobody walks over to a stall that has gone.
 */
export function markPackedUp(s: Snapshot, stallId: string): Snapshot {
  const stall = s.stalls.find((row) => row.id === stallId);
  if (!stall || !stall.arrivedToday || stall.packedUpToday) return s;
  const live = s.orders.some(
    (row) => row.stallId === stallId && (row.status === "placed" || row.status === "ready"),
  );
  if (live) return s;
  return {
    ...s,
    stalls: s.stalls.map((row) => (row.id === stallId ? { ...row, packedUpToday: true } : row)),
  };
}

/**
 * Closing-time backstop. Vendors forget to tap, and a stale list is worse than
 * no list, so everyone still shown as trading is packed up once the venue's
 * closing time passes.
 */
export function autoPackUpAtClose(s: Snapshot, at = Date.now()): Snapshot {
  const closed = new Set(
    s.venues.filter((venue) => pastClosingTime(s, venue, at)).map((venue) => venue.id),
  );
  if (closed.size === 0) return s;
  let changed = false;
  const stalls = s.stalls.map((row) => {
    if (!closed.has(row.venueId) || !row.arrivedToday || row.packedUpToday) return row;
    changed = true;
    return { ...row, packedUpToday: true };
  });
  return changed ? { ...s, stalls } : s;
}

/** Withdraw tonight's sign-up. Also refused after the cutoff. */
export function withdraw(s: Snapshot, stallId: string, at = Date.now()): Snapshot {
  const found = context(s, stallId);
  if (!found || !signupOpenNow(s, found.venue, at)) return s;
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
  // While sign-up is still open the freed plot goes straight back into the
  // draw. After the cutoff it is left empty on purpose: a waitlisted vendor
  // has to claim it, because by then they may well have gone home.
  return signupOpenNow(s, found.venue) ? reallocate(s, found.venue, stalls) : { ...s, stalls };
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
      row.venueId === venueId
        ? { ...row, ...CLEARED, noShowToday: false, lastPlotId: row.lotPlotId || row.lastPlotId }
        : row,
    ),
  };
}
