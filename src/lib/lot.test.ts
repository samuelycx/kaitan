import { describe, expect, it } from "vitest";
import { assignLotSlots, canLeaveReview, claimPlots, formatSlotNo, nextVacantLot, plotFits, tonightBooths } from "./lot";
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
    cover: "",
    blurb: "",
    status: partial.status ?? "active",
    compliant: true,
    licenseTier: partial.licenseTier ?? "display",
    orderingRequested: false,
    orderingPaused: false,
    feePaidThisMonth: true,
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
    expect(canLeaveReview(shop, [{ stallId: "s-lin", status: "placed" }], false)).toBe(false);
    expect(canLeaveReview(shop, [{ stallId: "s-lin", status: "picked" }], false)).toBe(true);
  });

  it("lets a walk-up stall be reviewed after the eater says they ate", () => {
    const shop = stall({ id: "s-6", licenseTier: "display" });
    expect(canLeaveReview(shop, [], false)).toBe(false);
    expect(canLeaveReview(shop, [], true)).toBe(true);
  });
});
