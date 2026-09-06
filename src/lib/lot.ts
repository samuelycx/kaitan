import { stallScore } from "./types";
import type { LotPlot, Order, Review, Stall, Venue, VenueFloor } from "./types";

export function formatSlotNo(slot: number) {
  if (!slot || slot < 1) return "—";
  return String(slot).padStart(2, "0");
}

export function nextVacantLot(taken: number[], slots: number) {
  const used = new Set(taken.filter((n) => n >= 1 && n <= slots));
  for (let i = 1; i <= slots; i += 1) {
    if (!used.has(i)) return i;
  }
  return 0;
}

export function plotUseFor(category: string) {
  if (category.includes("水果")) return "fruit" as const;
  if (category.includes("便民") || category.includes("修")) return "service" as const;
  if (category.includes("串") || category.includes("炭")) return "grill" as const;
  return "snack" as const;
}

export function plotUseLabel(use: LotPlot["use"]) {
  if (use === "fruit") return "水果宽位";
  if (use === "grill") return "炭火深位";
  if (use === "service") return "便民小位";
  return "小吃格";
}

export function plotFits(category: string, plot: LotPlot) {
  return plot.use === plotUseFor(category);
}

export function findPlot(floor: VenueFloor | undefined, plotId: string) {
  return floor?.plots.find((row) => row.id === plotId);
}

export function plotByNo(floor: VenueFloor | undefined, no: number | string) {
  const label = typeof no === "number" ? formatSlotNo(no) : no;
  return floor?.plots.find((row) => row.no === label);
}

export function assignLotSlots<T extends { id: string; venueId: string; allottedToday: boolean; lotSlot: number }>(
  stalls: T[],
  venueId: string,
  slots: number,
): T[] {
  const claimed = new Set<number>();
  const next = stalls.map((row) => {
    if (row.venueId !== venueId) return { ...row };
    if (!row.allottedToday) return { ...row, lotSlot: 0 };
    if (row.lotSlot >= 1 && row.lotSlot <= slots && !claimed.has(row.lotSlot)) {
      claimed.add(row.lotSlot);
      return { ...row };
    }
    return { ...row, lotSlot: 0 };
  });
  return next.map((row) => {
    if (row.venueId !== venueId || !row.allottedToday || row.lotSlot) return row;
    const lotSlot = nextVacantLot([...claimed], slots);
    if (lotSlot) claimed.add(lotSlot);
    return { ...row, lotSlot };
  });
}

/**
 * The order stalls get to keep the plot they asked for. Customers' reviews come
 * first — a stall people rate well holds its pitch, one that keeps disappointing
 * them loses a contested plot to somebody better. Sign-up time only breaks ties,
 * so being quick on the phone no longer beats being good at the counter.
 */
export function pickOrder(stalls: Stall[], reviews: Pick<Review, "stallId" | "stars" | "verified">[]) {
  const score = new Map(stalls.map((row) => [row.id, stallScore(reviews as Review[], row.id)]));
  return [...stalls].sort(
    (a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || a.signedUpAt - b.signedUpAt,
  );
}

export function claimPlots(stalls: Stall[], venue: Venue, reviews: Review[] = []): Stall[] {
  const plots = venue.floor?.plots ?? [];
  if (plots.length === 0) return assignLotSlots(stalls, venue.id, venue.slots);
  const signed = pickOrder(
    stalls.filter((s) => s.venueId === venue.id && s.status === "active" && s.signedUpToday),
    reviews,
  );
  const taken = new Map<string, string>();
  for (const row of signed) {
    const plot = plots.find((p) => p.id === row.lotPlotId);
    if (!plot || taken.has(plot.id) || !plotFits(row.category, plot)) continue;
    taken.set(plot.id, row.id);
  }
  // Whoever asked for "any free plot" gets moved onto one, still in sign-up
  // order, so losing a contested plot does not mean losing the evening.
  const moved = new Map<string, string>();
  for (const row of signed) {
    if (row.plotPreference !== "any") continue;
    if (taken.get(row.lotPlotId) === row.id) continue;
    const free = plots.find(
      (p) => !taken.has(p.id) && !moved.has(p.id) && plotFits(row.category, p),
    );
    if (free) moved.set(free.id, row.id);
  }

  return stalls.map((row) => {
    if (row.venueId !== venue.id) return row;
    const kept = Boolean(row.lotPlotId && taken.get(row.lotPlotId) === row.id);
    const movedTo = plots.find((p) => moved.get(p.id) === row.id);
    const won = kept || Boolean(movedTo);
    const plot = movedTo ?? plots.find((p) => p.id === row.lotPlotId);
    return {
      ...row,
      allottedToday: won,
      lotSlot: won && plot ? Number(plot.no) : 0,
      lotPlotId: movedTo ? movedTo.id : won || row.signedUpToday ? row.lotPlotId : "",
    };
  });
}

export function tonightBooths(stalls: Stall[], floor?: VenueFloor) {
  return stalls
    .filter((s) => s.status === "active" && s.allottedToday && (s.lotPlotId || s.lotSlot >= 1))
    .map((s) => {
      const plot = s.lotPlotId ? findPlot(floor, s.lotPlotId) : plotByNo(floor, s.lotSlot);
      return {
        stall: s,
        slotNo: plot?.no ?? formatSlotNo(s.lotSlot),
        plot,
      };
    })
    .sort((a, b) => Number(a.slotNo) - Number(b.slotNo));
}

/**
 * Which collected tickets this customer can still write up. One review per
 * ticket: that is what keeps the average honest and stops a stall being buried
 * or boosted by one person writing ten times.
 */
export function reviewableOrders(
  orders: Pick<Order, "id" | "stallId" | "status">[],
  reviews: Pick<Review, "orderId">[],
  stallId?: string,
) {
  const written = new Set(reviews.map((row) => row.orderId).filter(Boolean));
  return orders.filter(
    (row) => row.status === "picked" && !written.has(row.id) && (!stallId || row.stallId === stallId),
  );
}

/**
 * A stall that cannot take mini-program orders never leaves a ticket, so its
 * customers have to say so themselves — once per stall, and marked unverified.
 */
export function canSayAteHere(
  stall: Pick<Stall, "id" | "licenseTier">,
  reviews: Pick<Review, "stallId" | "orderId" | "consumerId">[],
  consumerId: string,
) {
  if (stall.licenseTier === "ordering") return false;
  return !reviews.some((row) => row.stallId === stall.id && !row.orderId && row.consumerId === consumerId);
}

export function canLeaveReview(
  stall: Pick<Stall, "id" | "licenseTier">,
  orders: Pick<Order, "id" | "stallId" | "status">[],
  ateHere: boolean,
  reviews: Pick<Review, "stallId" | "orderId" | "consumerId">[] = [],
  consumerId = "",
) {
  if (stall.licenseTier === "ordering") {
    return reviewableOrders(orders, reviews as Pick<Review, "orderId">[], stall.id).length > 0;
  }
  return ateHere && canSayAteHere(stall, reviews, consumerId);
}
