import { describe, expect, it } from "vitest";
import {
  assignLotSlots,
  canLeaveReview,
  canSayAteHere,
  claimPlots,
  formatSlotNo,
  nextVacantLot,
  pickOrder,
  plotFits,
  reviewableOrders,
  tonightBooths,
} from "./lot";
import { stallScore } from "./types";
import type { Review } from "./types";
import type { Venue } from "./types";

function stall(partial: {
  id: string;
  allottedToday?: boolean;
  lotSlot?: number;
  lotPlotId?: string;
  category?: string;
  signedUpAt?: number;
  status?: "active" | "pending";
  licenseTier?: "display" | "ordering";
  plotPreference?: "only" | "any";
}) {
  return {
    id: partial.id,
    venueId: "venue-xiang",
    vendorId: partial.id,
    vendorName: partial.id,
    category: partial.category ?? "小吃",
    fromStreet: "",
    phone: "",
    appliedAt: 0,
    cover: "",
    blurb: "",
    status: partial.status ?? "active",
    compliant: true,
    licenseTier: partial.licenseTier ?? "display",
    orderingRequested: false,
    orderingPaused: false,
    feePaidThisMonth: true,
    feePaidAt: 0,
    signedUpToday: true,
    allottedToday: partial.allottedToday ?? true,
    arrivedToday: false,
    packedUpToday: false,
    noShowToday: false,
    plotPreference: partial.plotPreference ?? ("only" as const),
    lastPlotId: "",
    signedUpAt: partial.signedUpAt ?? 1,
    lotSlot: partial.lotSlot ?? 0,
    lotPlotId: partial.lotPlotId ?? "",
  };
}

const floorVenue = {
  id: "venue-xiang",
  slots: 3,
  floor: {
    width: 100,
    height: 100,
    gate: { x: 50, y: 90, label: "场口" },
    plots: [
      { id: "p01", no: "01", x: 0, y: 0, w: 20, h: 16, use: "snack" as const },
      { id: "p05", no: "05", x: 40, y: 0, w: 28, h: 20, use: "grill" as const },
      { id: "p20", no: "20", x: 0, y: 40, w: 30, h: 22, use: "fruit" as const },
    ],
  },
} as Venue;

describe("formatSlotNo", () => {
  it("pads a field slot", () => {
    expect(formatSlotNo(6)).toBe("06");
  });

  it("returns dash when there is no slot", () => {
    expect(formatSlotNo(0)).toBe("—");
  });
});

describe("nextVacantLot", () => {
  it("skips taken physical cells", () => {
    expect(nextVacantLot([1, 5, 8], 24)).toBe(2);
  });
});

describe("assignLotSlots", () => {
  it("keeps a stall on its field cell and packs newcomers into vacant cells", () => {
    const rows = assignLotSlots(
      [
        stall({ id: "s-1", lotSlot: 1, signedUpAt: 1 }),
        stall({ id: "s-lin", lotSlot: 0, signedUpAt: 99 }),
        stall({ id: "s-wait", allottedToday: false, lotSlot: 12 }),
      ],
      "venue-xiang",
      24,
    );
    expect(rows.find((s) => s.id === "s-1")?.lotSlot).toBe(1);
    expect(rows.find((s) => s.id === "s-lin")?.lotSlot).toBe(2);
    expect(rows.find((s) => s.id === "s-wait")?.lotSlot).toBe(0);
  });
});

describe("tonightBooths", () => {
  it("uses the field cell, not signup order", () => {
    const booths = tonightBooths([
      stall({ id: "late", lotSlot: 16, signedUpAt: 1 }),
      stall({ id: "early", lotSlot: 5, signedUpAt: 90 }),
    ]);
    expect(booths.map((row) => `${row.slotNo}:${row.stall.id}`)).toEqual(["05:early", "16:late"]);
  });
});

describe("plotFits", () => {
  it("keeps fruit and grill on matching footprints", () => {
    expect(plotFits("水果", floorVenue.floor.plots[2])).toBe(true);
    expect(plotFits("小吃", floorVenue.floor.plots[2])).toBe(false);
    expect(plotFits("烤串", floorVenue.floor.plots[1])).toBe(true);
    expect(plotFits("小吃", floorVenue.floor.plots[0])).toBe(true);
  });
});

describe("claimPlots", () => {
  it("gives a plot to the earlier signup when two tap the same cell", () => {
    const rows = claimPlots(
      [
        stall({ id: "first", lotPlotId: "p01", signedUpAt: 1 }),
        stall({ id: "second", lotPlotId: "p01", signedUpAt: 9 }),
      ],
      floorVenue,
    );
    expect(rows.find((s) => s.id === "first")?.allottedToday).toBe(true);
    expect(rows.find((s) => s.id === "second")?.allottedToday).toBe(false);
  });

  it("rejects a snack stall on a fruit footprint", () => {
    const rows = claimPlots([stall({ id: "s-1", lotPlotId: "p20", category: "小吃" })], floorVenue);
    expect(rows[0]?.allottedToday).toBe(false);
  });
});

describe("canLeaveReview", () => {
  it("lets an ordering stall be reviewed only after pickup", () => {
    const shop = stall({ id: "s-lin", licenseTier: "ordering" });
    expect(canLeaveReview(shop, [{ id: "o-1", stallId: "s-lin", status: "placed" }], false)).toBe(false);
    expect(canLeaveReview(shop, [{ id: "o-1", stallId: "s-lin", status: "picked" }], false)).toBe(true);
  });

  it("lets a walk-up stall be reviewed after the eater says they ate", () => {
    const shop = stall({ id: "s-6", licenseTier: "display" });
    expect(canLeaveReview(shop, [], false)).toBe(false);
    expect(canLeaveReview(shop, [], true)).toBe(true);
  });
});

function review(partial: { stallId: string; stars: number; verified?: boolean; orderId?: string; consumerId?: string }): Review {
  return {
    id: `r-${partial.stallId}-${partial.stars}-${partial.orderId ?? "x"}`,
    stallId: partial.stallId,
    stars: partial.stars,
    note: "",
    nick: "路过的人",
    consumerId: partial.consumerId ?? "c-1",
    orderId: partial.orderId,
    verified: partial.verified ?? false,
    at: 1,
  };
}

describe("reviewableOrders", () => {
  it("only offers collected tickets that have not been written up", () => {
    const orders = [
      { id: "o-1", stallId: "s-1", status: "picked" as const },
      { id: "o-2", stallId: "s-1", status: "placed" as const },
      { id: "o-3", stallId: "s-1", status: "picked" as const },
    ];
    const rows = reviewableOrders(orders, [review({ stallId: "s-1", stars: 5, orderId: "o-1" })], "s-1");
    expect(rows.map((row) => row.id)).toEqual(["o-3"]);
  });
});

describe("canSayAteHere", () => {
  it("is open to a walk-up stall once, and never to one that issues tickets", () => {
    const walkUp = stall({ id: "s-6", licenseTier: "display" });
    expect(canSayAteHere(walkUp, [], "c-1")).toBe(true);
    expect(canSayAteHere(walkUp, [review({ stallId: "s-6", stars: 4 })], "c-1")).toBe(false);
    expect(canSayAteHere(walkUp, [review({ stallId: "s-6", stars: 4 })], "c-2")).toBe(true);
    expect(canSayAteHere(stall({ id: "s-1", licenseTier: "ordering" }), [], "c-1")).toBe(false);
  });
});

describe("stallScore", () => {
  it("starts a new stall level with the rest and moves slowly", () => {
    expect(stallScore([], "s-new")).toBe(4);
    const one = stallScore([review({ stallId: "s-1", stars: 5 })], "s-1");
    expect(one).toBeGreaterThan(4);
    expect(one).toBeLessThan(4.2);
  });

  it("counts a ticket-backed word for more than a bare one", () => {
    const bare = stallScore([review({ stallId: "s-1", stars: 1 })], "s-1");
    const backed = stallScore([review({ stallId: "s-1", stars: 1, verified: true, orderId: "o-1" })], "s-1");
    expect(backed).toBeLessThan(bare);
  });
});

describe("pickOrder", () => {
  it("puts the better-reviewed stall first, and keeps sign-up order on a tie", () => {
    const rows = pickOrder(
      [stall({ id: "late", signedUpAt: 9 }), stall({ id: "early", signedUpAt: 1 })],
      [
        review({ stallId: "late", stars: 5, verified: true, orderId: "o-1" }),
        review({ stallId: "late", stars: 5, verified: true, orderId: "o-2" }),
      ],
    );
    expect(rows.map((row) => row.id)).toEqual(["late", "early"]);
    expect(pickOrder([stall({ id: "late", signedUpAt: 9 }), stall({ id: "early", signedUpAt: 1 })], []).map((r) => r.id)).toEqual([
      "early",
      "late",
    ]);
  });

  it("hands a contested plot to the better-reviewed stall", () => {
    const rows = claimPlots(
      [stall({ id: "good", lotPlotId: "p01", signedUpAt: 9 }), stall({ id: "poor", lotPlotId: "p01", signedUpAt: 1 })],
      floorVenue,
      [
        review({ stallId: "good", stars: 5, verified: true, orderId: "o-1" }),
        review({ stallId: "good", stars: 5, verified: true, orderId: "o-2" }),
        review({ stallId: "poor", stars: 1, verified: true, orderId: "o-3" }),
        review({ stallId: "poor", stars: 1, verified: true, orderId: "o-4" }),
      ],
    );
    expect(rows.find((s) => s.id === "good")?.allottedToday).toBe(true);
    expect(rows.find((s) => s.id === "poor")?.allottedToday).toBe(false);
  });
});
