import { describe, expect, it } from "vitest";
import {
  closeSignup,
  markNoShow,
  markOrder,
  openNextDay,
  refundOrder,
  signUp,
  withdraw,
} from "./rules";
import { canLeaveReview } from "./lot";
import { canTakeMiniOrder, stallPayLabel } from "./types";
import type { Order, Snapshot, Stall, Venue } from "./types";

const VENUE_ID = "venue-xiang";

function stall(partial: Partial<Stall> & { id: string }): Stall {
  return {
    venueId: VENUE_ID,
    vendorId: partial.id,
    vendorName: partial.id,
    category: "小吃",
    fromStreet: "",
    cover: "",
    blurb: "",
    status: "active",
    compliant: true,
    licenseTier: "display",
    orderingRequested: false,
    orderingPaused: false,
    feePaidThisMonth: true,
    signedUpToday: false,
    allottedToday: false,
    arrivedToday: false,
    noShowToday: false,
    signedUpAt: 0,
    lotSlot: 0,
    lotPlotId: "",
    ...partial,
  };
}

const VENUE: Venue = {
  id: VENUE_ID,
  name: "巷口",
  organizerId: "o-site",
  organizerName: "管理员",
  district: "",
  address: "",
  open: "17:00",
  close: "22:00",
  signupBy: "15:00",
  signupOpen: true,
  slots: 2,
  feeYuanPerMonth: 800,
  note: "",
  closedToday: false,
  cover: "",
  floor: {
    width: 100,
    height: 100,
    gate: { x: 50, y: 90, label: "场口" },
    plots: [
      { id: "p01", no: "01", x: 0, y: 0, w: 20, h: 16, use: "snack" },
      { id: "p05", no: "05", x: 40, y: 0, w: 28, h: 20, use: "grill" },
    ],
  },
};

function order(partial: Partial<Order> & { id: string; stallId: string }): Order {
  return {
    vendorName: "摊",
    items: [{ dishId: "d-1", name: "面筋", priceYuan: 8, qty: 1 }],
    totalYuan: 8,
    pickupNo: "001",
    slotNo: "01",
    status: "placed",
    at: 1,
    ...partial,
  };
}

function snapshot(stalls: Stall[], orders: Order[] = [], venue: Venue = VENUE): Snapshot {
  return {
    venues: [venue],
    stalls,
    dishes: [],
    sales: [],
    orders,
    disputes: [],
    reviews: [],
    vendorId: "v-1",
    vendorName: "摊主",
    organizerId: "o-site",
    organizerName: "管理员",
    consumerId: "c-me",
    consumerName: "顾客",
  };
}

function find(s: Snapshot, id: string) {
  const row = s.stalls.find((r) => r.id === id);
  if (!row) throw new Error(`no stall ${id}`);
  return row;
}

describe("daily sign-up", () => {
  it("gives a plot to a stall that signs up while sign-up is open", () => {
    const next = signUp(snapshot([stall({ id: "a" })]), "a", "p01", 100);
    expect(find(next, "a").signedUpToday).toBe(true);
    expect(find(next, "a").allottedToday).toBe(true);
    expect(find(next, "a").lotPlotId).toBe("p01");
  });

  it("refuses a sign-up once the cutoff has passed", () => {
    const closed = { ...VENUE, signupOpen: false };
    const next = signUp(snapshot([stall({ id: "a" })], [], closed), "a", "p01", 100);
    expect(find(next, "a").signedUpToday).toBe(false);
    expect(find(next, "a").allottedToday).toBe(false);
  });

  it("refuses a stall that has not been approved yet", () => {
    const next = signUp(snapshot([stall({ id: "a", status: "pending" })]), "a", "p01", 100);
    expect(find(next, "a").signedUpToday).toBe(false);
  });

  it("refuses a plot that does not suit the trade", () => {
    const next = signUp(snapshot([stall({ id: "a", category: "水果" })]), "a", "p05", 100);
    expect(find(next, "a").signedUpToday).toBe(false);
  });

  it("keeps the original sign-up time when signing up twice", () => {
    const first = signUp(snapshot([stall({ id: "a" })]), "a", "p01", 100);
    const second = signUp(first, "a", "p01", 999);
    expect(find(second, "a").signedUpAt).toBe(100);
  });

  it("awards a contested plot to whoever signed up first, the loser staying on the waitlist", () => {
    const s = snapshot([
      stall({ id: "late", signedUpToday: true, signedUpAt: 200, lotPlotId: "p01" }),
      stall({ id: "early", signedUpToday: true, signedUpAt: 100, lotPlotId: "p01" }),
    ]);
    const next = closeSignup(s, VENUE_ID);
    expect(find(next, "early").allottedToday).toBe(true);
    expect(find(next, "early").lotPlotId).toBe("p01");
    expect(find(next, "late").allottedToday).toBe(false);
    // The loser keeps the plot as a standing preference, so a later release
    // of that plot can promote them.
    expect(find(next, "late").lotPlotId).toBe("p01");
  });

  it("frees the plot again when a vendor withdraws before the cutoff", () => {
    const signed = signUp(snapshot([stall({ id: "a" })]), "a", "p01", 100);
    const next = withdraw(signed, "a");
    expect(find(next, "a").allottedToday).toBe(false);
    expect(find(next, "a").lotPlotId).toBe("");
  });

  it("refuses a withdrawal after the cutoff", () => {
    const closed = { ...VENUE, signupOpen: false };
    const signed = snapshot([stall({ id: "a", signedUpToday: true, allottedToday: true, lotPlotId: "p01" })], [], closed);
    const next = withdraw(signed, "a");
    expect(find(next, "a").allottedToday).toBe(true);
  });
});

describe("no-show release", () => {
  it("hands the freed plot to the next stall in line", () => {
    const s = snapshot([
      stall({ id: "held", signedUpToday: true, allottedToday: true, signedUpAt: 100, lotPlotId: "p01" }),
      stall({ id: "waiting", signedUpToday: true, signedUpAt: 300, lotPlotId: "p01" }),
    ]);
    const next = markNoShow(s, "held");
    expect(find(next, "held").noShowToday).toBe(true);
    expect(find(next, "held").allottedToday).toBe(false);
    expect(find(next, "waiting").allottedToday).toBe(true);
    expect(find(next, "waiting").lotPlotId).toBe("p01");
  });

  it("will not release a stall that still owes a customer an order", () => {
    const s = snapshot(
      [stall({ id: "held", signedUpToday: true, allottedToday: true, lotPlotId: "p01" })],
      [order({ id: "o-1", stallId: "held", status: "ready" })],
    );
    const next = markNoShow(s, "held");
    expect(find(next, "held").allottedToday).toBe(true);
    expect(find(next, "held").noShowToday).toBe(false);
  });

  it("releases once the last order has been collected", () => {
    const s = snapshot(
      [stall({ id: "held", signedUpToday: true, allottedToday: true, lotPlotId: "p01" })],
      [order({ id: "o-1", stallId: "held", status: "picked" })],
    );
    expect(find(markNoShow(s, "held"), "held").noShowToday).toBe(true);
  });

  it("does nothing for a stall that never had a plot", () => {
    const s = snapshot([stall({ id: "a" })]);
    expect(markNoShow(s, "a")).toBe(s);
  });
});

describe("order lifecycle", () => {
  const base = snapshot([stall({ id: "a" })], [order({ id: "o-1", stallId: "a" })]);

  it("moves an order from waiting to ready, then to collected", () => {
    const ready = markOrder(base, "o-1", "ready");
    expect(ready.orders[0].status).toBe("ready");
    expect(markOrder(ready, "o-1", "picked").orders[0].status).toBe("picked");
  });

  it("refuses to skip straight to collected", () => {
    expect(markOrder(base, "o-1", "picked")).toBe(base);
  });

  it("refuses to reopen a collected order", () => {
    const picked = markOrder(markOrder(base, "o-1", "ready"), "o-1", "picked");
    expect(markOrder(picked, "o-1", "ready")).toBe(picked);
  });

  it("refunds an order that has not been collected", () => {
    expect(refundOrder(base, "o-1").orders[0].status).toBe("refunded");
  });

  it("refuses to refund a collected order", () => {
    const picked = markOrder(markOrder(base, "o-1", "ready"), "o-1", "picked");
    expect(refundOrder(picked, "o-1")).toBe(picked);
  });

  it("refuses to refund twice", () => {
    const refunded = refundOrder(base, "o-1");
    expect(refundOrder(refunded, "o-1")).toBe(refunded);
  });
});

describe("next trading day", () => {
  it("clears every sign-up so nobody keeps last night's plot", () => {
    const s = snapshot([
      stall({ id: "a", signedUpToday: true, allottedToday: true, arrivedToday: true, lotSlot: 1, lotPlotId: "p01" }),
      stall({ id: "b", noShowToday: true }),
    ]);
    const next = openNextDay(closeSignup(s, VENUE_ID), VENUE_ID);
    expect(next.venues[0].signupOpen).toBe(true);
    expect(next.stalls.every((row) => !row.signedUpToday && !row.allottedToday && !row.lotPlotId)).toBe(true);
    expect(find(next, "b").noShowToday).toBe(false);
  });
});

describe("licence gate on mini-programme ordering", () => {
  const allotted = { signedUpToday: true, allottedToday: true, lotPlotId: "p01" };

  it("lets a licensed stall that has a plot take orders", () => {
    expect(canTakeMiniOrder(stall({ id: "a", licenseTier: "ordering", ...allotted }))).toBe(true);
  });

  it("refuses a stall with only the view-only licence", () => {
    expect(canTakeMiniOrder(stall({ id: "a", licenseTier: "display", ...allotted }))).toBe(false);
  });

  it("refuses a licensed stall that has no plot tonight", () => {
    expect(canTakeMiniOrder(stall({ id: "a", licenseTier: "ordering" }))).toBe(false);
  });

  it("refuses a licensed stall that has paused ordering", () => {
    expect(canTakeMiniOrder(stall({ id: "a", licenseTier: "ordering", orderingPaused: true, ...allotted }))).toBe(false);
  });

  it("refuses a stall still awaiting approval", () => {
    expect(canTakeMiniOrder(stall({ id: "a", licenseTier: "ordering", status: "pending", ...allotted }))).toBe(false);
  });

  it("shows pay-at-the-stall for an unlicensed stall and order-ahead for a licensed one", () => {
    expect(stallPayLabel(stall({ id: "a", licenseTier: "display", ...allotted }))).toBe("到摊付");
    expect(stallPayLabel(stall({ id: "b", licenseTier: "ordering", ...allotted }))).toBe("可点单");
    expect(stallPayLabel(stall({ id: "c", licenseTier: "ordering", orderingPaused: true, ...allotted }))).toBe("暂停接单");
  });
});

describe("who may leave a review", () => {
  it("requires a collected order at a licensed stall", () => {
    const shop = stall({ id: "a", licenseTier: "ordering" });
    expect(canLeaveReview(shop, [order({ id: "o-1", stallId: "a", status: "picked" })], false)).toBe(true);
    expect(canLeaveReview(shop, [order({ id: "o-1", stallId: "a", status: "placed" })], false)).toBe(false);
    expect(canLeaveReview(shop, [], true)).toBe(false);
  });

  it("accepts a self-declared visit at a pay-at-the-stall stall", () => {
    const shop = stall({ id: "a", licenseTier: "display" });
    expect(canLeaveReview(shop, [], true)).toBe(true);
    expect(canLeaveReview(shop, [], false)).toBe(false);
  });
});
