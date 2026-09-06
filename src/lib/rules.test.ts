import { describe, expect, it } from "vitest";
import {
  autoPackUpAtClose,
  claimFreedPlot,
  closeSignup,
  markArrived,
  markPackedUp,
  markNoShow,
  markOrder,
  openNextDay,
  register,
  reviewMany,
  refundOrder,
  setPlotPreference,
  signUp,
  signupOpenNow,
  withdraw,
} from "./rules";
import { canLeaveReview } from "./lot";
import { boothState, canTakeMiniOrder, stallPayLabel } from "./types";
import { attendance, occupancy, occupancyAverage } from "./ledger";
import type { DayRecord, Order, Sale, Snapshot, Stall, Venue } from "./types";

const VENUE_ID = "venue-xiang";

function stall(partial: Partial<Stall> & { id: string }): Stall {
  return {
    venueId: VENUE_ID,
    vendorId: partial.id,
    vendorName: partial.id,
    category: "小吃",
    fromStreet: "",
    phone: "",
    appliedAt: 0,
    cover: "",
    blurb: "",
    status: "active",
    compliant: true,
    licenseTier: "display",
    orderingRequested: false,
    orderingPaused: false,
    feePaidThisMonth: true,
    feePaidAt: 0,
    signedUpToday: false,
    allottedToday: false,
    arrivedToday: false,
    packedUpToday: false,
    noShowToday: false,
    plotPreference: "only",
    lastPlotId: "",
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
    demoMinutes: 600,
    tradingDate: "2026-09-06",
    dayStartedAt: 0,
    dayLog: [],
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
  const allotted = { signedUpToday: true, allottedToday: true, arrivedToday: true, lotPlotId: "p01" };

  it("lets a licensed stall that has opened take orders", () => {
    expect(
      canTakeMiniOrder(stall({ id: "a", licenseTier: "ordering", ...allotted, arrivedToday: true })),
    ).toBe(true);
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

describe("到场状态", () => {
  it("reads a stall that has a plot but has not shown up as not open yet", () => {
    expect(boothState(stall({ id: "a", allottedToday: true }))).toBe("waiting");
  });

  it("opens the stall when the vendor taps arrived", () => {
    const s = markArrived(snapshot([stall({ id: "a", allottedToday: true })]), "a", true);
    expect(boothState(s.stalls[0])).toBe("open");
  });

  it("ignores an arrival tap from a stall that has no plot tonight", () => {
    const s = snapshot([stall({ id: "a" })]);
    expect(markArrived(s, "a", true).stalls[0].arrivedToday).toBe(false);
  });

  it("packs the stall up when the vendor taps it", () => {
    const open = markArrived(snapshot([stall({ id: "a", allottedToday: true })]), "a", true);
    expect(boothState(markPackedUp(open, "a").stalls[0])).toBe("packed");
  });

  it("refuses to pack up while an order is still waiting to be collected", () => {
    const open = markArrived(
      snapshot([stall({ id: "a", allottedToday: true })], [order({ id: "o-1", stallId: "a" })]),
      "a",
      true,
    );
    expect(boothState(markPackedUp(open, "a").stalls[0])).toBe("open");
  });

  it("packs everyone up once closing time passes, tap or no tap", () => {
    const open = markArrived(snapshot([stall({ id: "a", allottedToday: true })]), "a", true);
    const late = { ...open, demoMinutes: 22 * 60 + 30 };
    expect(boothState(autoPackUpAtClose(late).stalls[0])).toBe("packed");
  });

  it("leaves stalls alone while the venue is still trading", () => {
    const open = markArrived(snapshot([stall({ id: "a", allottedToday: true })]), "a", true);
    const evening = { ...open, demoMinutes: 19 * 60 };
    expect(boothState(autoPackUpAtClose(evening).stalls[0])).toBe("open");
  });
});

describe("截止时间自动生效", () => {
  it("takes sign-ups before the printed cutoff", () => {
    expect(signupOpenNow({ ...snapshot([]), demoMinutes: 10 * 60 }, VENUE)).toBe(true);
  });

  it("stops taking sign-ups once the cutoff passes, with nobody pressing anything", () => {
    const late = { ...snapshot([stall({ id: "a" })]), demoMinutes: 15 * 60 + 1 };
    expect(signupOpenNow(late, VENUE)).toBe(false);
    expect(signUp(late, "a", "p01", 1).stalls[0].signedUpToday).toBe(false);
  });

  it("still lets the organizer close early", () => {
    const early = { ...snapshot([]), demoMinutes: 10 * 60 };
    expect(signupOpenNow(early, { ...VENUE, signupOpen: false })).toBe(false);
  });
});

describe("抢位落败后的偏好", () => {
  it("keeps waiting for the exact plot when the vendor asked for that one only", () => {
    const s = snapshot([
      stall({ id: "a", signedUpToday: true, signedUpAt: 1, lotPlotId: "p01" }),
      stall({ id: "b", signedUpToday: true, signedUpAt: 2, lotPlotId: "p01" }),
    ]);
    const after = closeSignup(s, VENUE_ID);
    expect(after.stalls.find((row) => row.id === "b")?.allottedToday).toBe(false);
  });

  it("moves the loser onto another plot that fits when they said any plot will do", () => {
    const s = snapshot([
      stall({ id: "a", signedUpToday: true, signedUpAt: 1, lotPlotId: "p01" }),
      stall({
        id: "b",
        signedUpToday: true,
        signedUpAt: 2,
        lotPlotId: "p01",
        category: "烤串",
        plotPreference: "any",
      }),
    ]);
    const after = closeSignup(s, VENUE_ID);
    const loser = after.stalls.find((row) => row.id === "b");
    expect(loser?.allottedToday).toBe(true);
    expect(loser?.lotPlotId).toBe("p05");
  });

  it("switching the preference re-runs the allocation", () => {
    const s = snapshot([
      stall({ id: "a", signedUpToday: true, signedUpAt: 1, lotPlotId: "p01" }),
      stall({ id: "b", signedUpToday: true, signedUpAt: 2, lotPlotId: "p01", category: "烤串" }),
    ]);
    const after = setPlotPreference(s, "b", "any");
    expect(after.stalls.find((row) => row.id === "b")?.lotPlotId).toBe("p05");
  });
});

describe("截止后放出来的位", () => {
  it("does not hand a freed plot to the waitlist on its own", () => {
    const s = closeSignup(
      snapshot([
        stall({ id: "a", signedUpToday: true, signedUpAt: 1, lotPlotId: "p01" }),
        stall({ id: "b", signedUpToday: true, signedUpAt: 2, lotPlotId: "p01" }),
      ]),
      VENUE_ID,
    );
    const freed = markNoShow(s, "a");
    expect(freed.stalls.find((row) => row.id === "b")?.allottedToday).toBe(false);
  });

  it("gives it to a waitlisted vendor who actively claims it", () => {
    const s = closeSignup(
      snapshot([
        stall({ id: "a", signedUpToday: true, signedUpAt: 1, lotPlotId: "p01" }),
        stall({ id: "b", signedUpToday: true, signedUpAt: 2, lotPlotId: "p01" }),
      ]),
      VENUE_ID,
    );
    const freed = markNoShow(s, "a");
    const claimed = claimFreedPlot(freed, "b", "p01");
    expect(claimed.stalls.find((row) => row.id === "b")?.allottedToday).toBe(true);
  });

  it("refuses a claim on a plot someone is still standing on", () => {
    const s = closeSignup(
      snapshot([
        stall({ id: "a", signedUpToday: true, signedUpAt: 1, lotPlotId: "p01" }),
        stall({ id: "b", signedUpToday: true, signedUpAt: 2, lotPlotId: "p01" }),
      ]),
      VENUE_ID,
    );
    expect(claimFreedPlot(s, "b", "p01").stalls.find((row) => row.id === "b")?.allottedToday).toBe(false);
  });
});

describe("一步报名", () => {
  it("signs up on last night's plot with no plot picked", () => {
    const s = snapshot([stall({ id: "a", lastPlotId: "p01" })]);
    const after = signUp(s, "a", undefined, 5);
    expect(after.stalls[0].signedUpToday).toBe(true);
    expect(after.stalls[0].lotPlotId).toBe("p01");
  });

  it("has nothing to reuse for a first-time vendor, so they must pick", () => {
    const s = snapshot([stall({ id: "a" })]);
    expect(signUp(s, "a", undefined, 5).stalls[0].signedUpToday).toBe(false);
  });

  it("remembers tonight's plot when the next trading day opens", () => {
    const s = snapshot([stall({ id: "a", allottedToday: true, lotPlotId: "p01" })]);
    expect(openNextDay(s, VENUE_ID).stalls[0].lastPlotId).toBe("p01");
  });
});

describe("每天留档", () => {
  function withSales(s: Snapshot, sales: Sale[]): Snapshot {
    return { ...s, sales };
  }

  it("files tonight away when the next day opens", () => {
    const s = snapshot([
      stall({ id: "a", signedUpToday: true, allottedToday: true, arrivedToday: true, lotSlot: 1 }),
    ]);
    const after = openNextDay(s, VENUE_ID);
    expect(after.dayLog).toHaveLength(1);
    expect(after.dayLog[0]).toMatchObject({ date: "2026-09-06", arrived: true, plotNo: "1" });
    expect(after.stalls[0].arrivedToday).toBe(false);
  });

  it("does not let a new day overwrite the day before", () => {
    const s = snapshot([stall({ id: "a", signedUpToday: true, allottedToday: true, arrivedToday: true })]);
    const day2 = openNextDay(s, VENUE_ID);
    // The next day trades too, so there is something to file a second time.
    const traded = {
      ...day2,
      stalls: day2.stalls.map((row) => ({ ...row, signedUpToday: true, allottedToday: true, arrivedToday: true })),
    };
    const twice = openNextDay(traded, VENUE_ID);
    expect(twice.dayLog.map((row) => row.date)).toEqual(["2026-09-06", "2026-09-07"]);
  });

  it("leaves out anyone who never signed up that day", () => {
    const s = snapshot([stall({ id: "a" })]);
    expect(openNextDay(s, VENUE_ID).dayLog).toHaveLength(0);
  });

  it("records the no-show as a no-show, not as an absence", () => {
    const s = snapshot([stall({ id: "a", noShowToday: true })]);
    expect(openNextDay(s, VENUE_ID).dayLog[0]).toMatchObject({ noShow: true, arrived: false });
  });

  it("counts only the takings of the day being filed", () => {
    const s = withSales(
      { ...snapshot([stall({ id: "a", signedUpToday: true, allottedToday: true, arrivedToday: true })]), dayStartedAt: 100 },
      [
        { id: "x", stallId: "a", dishName: "旧的", priceYuan: 50, channel: "stall", at: 40 },
        { id: "y", stallId: "a", dishName: "今天的", priceYuan: 12, channel: "stall", at: 200 },
      ],
    );
    expect(openNextDay(s, VENUE_ID).dayLog[0]).toMatchObject({ salesYuan: 12, saleCount: 1 });
  });
});

describe("管场对账", () => {
  function record(partial: Partial<DayRecord> & { date: string; stallId: string }): DayRecord {
    return {
      id: `${partial.date}:${partial.stallId}`,
      venueId: VENUE_ID,
      vendorName: partial.stallId,
      signedUp: true,
      allotted: true,
      arrived: true,
      noShow: false,
      plotNo: "01",
      plotsThatDay: 20,
      salesYuan: 100,
      saleCount: 10,
      ...partial,
    };
  }

  const stalls = [stall({ id: "a" }), stall({ id: "b" })];

  it("answers how many days a vendor showed up and how often they did not", () => {
    const log = [
      record({ date: "2026-09-01", stallId: "a" }),
      record({ date: "2026-09-02", stallId: "a" }),
      record({ date: "2026-09-03", stallId: "a", arrived: false, noShow: true, salesYuan: 0 }),
      record({ date: "2026-08-31", stallId: "a" }),
    ];
    const rows = attendance(log, VENUE_ID, "2026-09", stalls);
    expect(rows.find((row) => row.stallId === "a")).toMatchObject({ days: 2, noShows: 1, salesYuan: 200 });
  });

  it("does not blame a vendor who signed up and lost the draw", () => {
    const log = [record({ date: "2026-09-01", stallId: "b", allotted: false, arrived: false, salesYuan: 0 })];
    expect(attendance(log, VENUE_ID, "2026-09", stalls).find((row) => row.stallId === "b")).toMatchObject({
      noShows: 0,
      waitlisted: 1,
    });
  });

  it("puts the vendors who stood the venue up at the top", () => {
    const log = [record({ date: "2026-09-01", stallId: "b", arrived: false, noShow: true })];
    expect(attendance(log, VENUE_ID, "2026-09", stalls)[0].stallId).toBe("b");
  });

  it("averages how many plots were taken and left empty", () => {
    const log = [
      record({ date: "2026-09-01", stallId: "a" }),
      record({ date: "2026-09-01", stallId: "b" }),
      record({ date: "2026-09-02", stallId: "a" }),
    ];
    const days = occupancy(log, VENUE_ID);
    expect(days.map((row) => row.date)).toEqual(["2026-09-02", "2026-09-01"]);
    expect(occupancyAverage(days)).toMatchObject({ days: 2, taken: 1.5, vacant: 18.5 });
  });

  it("keeps to the last week even when more days are on file", () => {
    const log = Array.from({ length: 10 }, (_, i) =>
      record({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, stallId: "a" }),
    );
    expect(occupancy(log, VENUE_ID)).toHaveLength(7);
  });
});

describe("摊主自己登记", () => {
  const empty = snapshot([]);
  const form = { venueId: VENUE_ID, vendorName: "王姐烤面筋", phone: "13800138000", category: "小吃", fromStreet: "地铁 A 口" };

  it("puts a new registration in the queue, not on the floor", () => {
    const after = register(empty, form, 10, "s-new");
    expect(after.stalls).toHaveLength(1);
    expect(after.stalls[0]).toMatchObject({ status: "pending", phone: "13800138000", appliedAt: 10 });
    expect(after.stalls[0].allottedToday).toBe(false);
  });

  it("hands the vendor app over to whoever just registered", () => {
    expect(register(empty, form, 10, "s-new")).toMatchObject({ vendorId: "s-new", vendorName: "王姐烤面筋" });
  });

  it("refuses a registration with no usable phone number", () => {
    expect(register(empty, { ...form, phone: "1380013" }, 10, "s-new").stalls).toHaveLength(0);
    expect(register(empty, { ...form, phone: "" }, 10, "s-new").stalls).toHaveLength(0);
  });

  it("refuses a registration with no name", () => {
    expect(register(empty, { ...form, vendorName: "  " }, 10, "s-new").stalls).toHaveLength(0);
  });

  it("does not let the same phone queue twice", () => {
    const once = register(empty, form, 10, "s-new");
    expect(register(once, { ...form, vendorName: "又填一遍" }, 20, "s-two").stalls).toHaveLength(1);
  });

  it("lets someone who was turned down register again", () => {
    const turned = reviewMany(register(empty, form, 10, "s-new"), ["s-new"], "rejected");
    expect(register(turned, form, 20, "s-two").stalls).toHaveLength(2);
  });
});

describe("批量审核", () => {
  function queued(ids: string[]) {
    return snapshot(ids.map((id) => stall({ id, status: "pending" })));
  }

  it("approves a whole batch in one press", () => {
    const after = reviewMany(queued(["a", "b", "c"]), ["a", "b"], "active");
    expect(after.stalls.filter((row) => row.status === "active").map((row) => row.id)).toEqual(["a", "b"]);
    expect(after.stalls.find((row) => row.id === "c")?.status).toBe("pending");
  });

  it("rejects a batch too", () => {
    const after = reviewMany(queued(["a", "b"]), ["a", "b"], "rejected");
    expect(after.stalls.every((row) => row.status === "rejected")).toBe(true);
  });

  it("leaves a vendor who is already in alone", () => {
    const s = snapshot([stall({ id: "a", status: "active", allottedToday: true })]);
    expect(reviewMany(s, ["a"], "rejected").stalls[0]).toMatchObject({ status: "active", allottedToday: true });
  });

  it("does nothing when nobody is selected", () => {
    const s = queued(["a"]);
    expect(reviewMany(s, [], "active")).toBe(s);
  });
});
