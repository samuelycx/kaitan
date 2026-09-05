import { useStore } from "./store";

export function useOrgDesk() {
  const store = useStore();
  const venue = store.venues.find((v) => v.organizerName === store.organizerName) ?? store.venues[0];
  const here = store.stalls.filter((s) => s.venueId === venue?.id);
  const active = here.filter((s) => s.status === "active");
  const pending = here.filter((s) => s.status === "pending");
  const allotted = active.filter((s) => s.allottedToday);
  const arrived = allotted.filter((s) => s.arrivedToday);
  const waitlist = active.filter((s) => s.signedUpToday && !s.allottedToday);
  const missed = active.filter((s) => !s.signedUpToday && !s.noShowToday);
  const noShows = here.filter((s) => s.noShowToday);
  const vacant = venue ? (venue.floor?.plots.length ?? venue.slots) - allotted.length : 0;
  const licenseQueue = active.filter((s) => s.licenseTier !== "ordering" && s.orderingRequested);
  const canOrder = active.filter((s) => s.licenseTier === "ordering");
  const tonightSales = store.sales.filter((row) => here.some((s) => s.id === row.stallId));
  const tonightOrders = (store.orders ?? []).filter((row) => here.some((s) => s.id === row.stallId));
  const feeUnpaid = active.filter((s) => !s.feePaidThisMonth);
  return {
    ...store,
    venue,
    here,
    active,
    pending,
    allotted,
    arrived,
    waitlist,
    missed,
    noShows,
    vacant,
    licenseQueue,
    canOrder,
    tonightSales,
    tonightOrders,
    feeUnpaid,
  };
}
