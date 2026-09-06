"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { canLeaveReview, claimPlots, formatSlotNo, plotByNo } from "./lot";
import { canTakeMiniOrder } from "./types";
import * as rules from "./rules";
import { SEED } from "./seed";
import type {
  Dish,
  Dispute,
  Order,
  OrderStatus,
  PlotPreference,
  Review,
  Role,
  Sale,
  Snapshot,
  Stall,
  Venue,
} from "./types";

const KEY = "kaitan-vendor-v2";

let idSeq = 0;

function newId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq.toString(36)}`;
}

function allocate(stalls: Stall[], venue: Venue): Stall[] {
  return claimPlots(stalls, venue);
}

type Store = Snapshot & {
  hydrated: boolean;
  role: Role;
  setRole: (role: Role) => void;
  apply: (venueId: string, category: string, fromStreet: string) => void;
  review: (stallId: string, status: "active" | "rejected") => void;
  signUp: (stallId: string, plotId?: string, preference?: PlotPreference) => void;
  setPlotPreference: (stallId: string, preference: PlotPreference) => void;
  claimFreedPlot: (stallId: string, plotId: string) => void;
  withdraw: (stallId: string) => void;
  /** Whether this venue is still taking sign-ups: clock first, organizer second. */
  isSignupOpen: (venueId: string) => boolean;
  /** Minutes past midnight the app is treating as now. */
  nowMinutes: number;
  setDemoMinutes: (minutes: number | null) => void;
  closeSignup: (venueId: string) => void;
  openNextDay: (venueId: string) => void;
  addDish: (stallId: string, name: string, priceYuan: number, photo?: string) => void;
  removeDish: (dishId: string) => void;
  toggleDishTonight: (dishId: string) => void;
  setDishPhoto: (dishId: string, photo: string) => void;
  recordStallSale: (stallId: string, dishId: string) => void;
  requestOrdering: (stallId: string) => void;
  reviewOrdering: (stallId: string, allow: boolean) => void;
  placeOrder: (stallId: string, picks: { dishId: string; qty: number }[]) => string | null;
  markOrder: (orderId: string, status: OrderStatus) => void;
  pauseOrdering: (stallId: string, paused: boolean) => void;
  markFeePaid: (stallId: string, paid: boolean) => void;
  setClosedToday: (venueId: string, closed: boolean) => void;
  markArrived: (stallId: string, arrived?: boolean) => void;
  markPackedUp: (stallId: string) => void;
  markNoShow: (stallId: string) => void;
  addDispute: (stallId: string, note: string) => void;
  addReview: (stallId: string, stars: number, note: string, ateHere?: boolean) => void;
  refundOrder: (orderId: string) => void;
};

const Ctx = createContext<Store | null>(null);

function load(): Snapshot {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    if (!parsed.venues?.[0]?.signupBy || !parsed.stalls || !parsed.dishes) return SEED;
    return {
      ...SEED,
      ...parsed,
      orders: parsed.orders ?? [],
      sales: parsed.sales ?? SEED.sales,
      disputes: parsed.disputes ?? [],
      reviews: parsed.reviews ?? SEED.reviews,
      consumerId: parsed.consumerId || SEED.consumerId,
      consumerName: parsed.consumerName || SEED.consumerName,
      demoMinutes: parsed.demoMinutes ?? null,
      venues: (parsed.venues ?? SEED.venues).map((row) => {
        const seeded = SEED.venues.find((v) => v.id === row.id);
        return {
          ...row,
          cover: row.cover || seeded?.cover || "/stalls/venue.jpg",
          floor: seeded?.floor ?? row.floor,
          slots: seeded?.floor?.plots.length ?? row.slots,
        };
      }),
      stalls: (() => {
        const have = new Set(parsed.stalls.map((row) => row.id));
        const venues = parsed.venues ?? SEED.venues;
        const merged = [...parsed.stalls, ...SEED.stalls.filter((row) => !have.has(row.id))].map((row) => {
          const seeded = SEED.stalls.find((s) => s.id === row.id);
          return {
            ...row,
            orderingPaused: row.orderingPaused ?? false,
            feePaidThisMonth: row.feePaidThisMonth ?? false,
            arrivedToday: row.arrivedToday ?? false,
            packedUpToday: row.packedUpToday ?? false,
            noShowToday: row.noShowToday ?? false,
            plotPreference: row.plotPreference ?? "only",
            lastPlotId: row.lastPlotId ?? seeded?.lastPlotId ?? "",
            cover: row.cover || seeded?.cover || "",
            blurb: row.blurb || seeded?.blurb || "",
            category: row.category || seeded?.category || "小吃",
            lotSlot:
              typeof row.lotSlot === "number" && row.lotSlot > 0
                ? row.lotSlot
                : row.allottedToday
                  ? seeded?.lotSlot ?? 0
                  : 0,
            lotPlotId:
              row.lotPlotId ||
              (row.allottedToday ? seeded?.lotPlotId || "" : "") ||
              (row.lotSlot ? plotByNo(SEED.venues[0]?.floor, row.lotSlot)?.id || "" : ""),
          };
        });
        return venues.reduce((rows, venue) => allocate(rows, { ...SEED.venues[0], ...venue, floor: venue.floor ?? SEED.venues[0]?.floor }), merged);
      })(),
      dishes: (() => {
        const have = new Set(parsed.dishes.map((row) => row.id));
        const merged = [...parsed.dishes, ...SEED.dishes.filter((row) => !have.has(row.id))];
        return merged.map((row) => {
          const seeded = SEED.dishes.find((d) => d.id === row.id);
          return { ...row, photo: row.photo || seeded?.photo || "" };
        });
      })(),
    };
  } catch {
    return SEED;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(SEED);
  const [role, setRole] = useState<Role>("consumer");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSnap(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(KEY, JSON.stringify(snap));
  }, [snap, hydrated]);

  // Closing time packs up anyone who forgot to tap, so the late-evening list
  // never shows a stall that has already gone.
  useEffect(() => {
    if (!hydrated) return;
    const tick = () => setSnap((cur) => rules.autoPackUpAtClose(cur));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [hydrated, snap.demoMinutes]);

  const value = useMemo<Store>(
    () => ({
      ...snap,
      hydrated,
      role,
      setRole,
      apply(venueId, category, fromStreet) {
        if (snap.stalls.some((s) => s.venueId === venueId && s.vendorId === snap.vendorId)) return;
        const row: Stall = {
          id: newId("s"),
          venueId,
          vendorId: snap.vendorId,
          vendorName: snap.vendorName,
          category,
          fromStreet,
          cover: "",
          blurb: "",
          status: "pending",
          compliant: false,
          licenseTier: "display",
          orderingRequested: false,
          orderingPaused: false,
          feePaidThisMonth: false,
          signedUpToday: false,
          allottedToday: false,
          arrivedToday: false,
          packedUpToday: false,
          noShowToday: false,
          signedUpAt: 0,
          lotSlot: 0,
          lotPlotId: "",
          plotPreference: "only",
          lastPlotId: "",
        };
        setSnap((s) => ({ ...s, stalls: [...s.stalls, row] }));
      },
      review(stallId, status) {
        setSnap((s) => {
          const stalls = s.stalls.map((row) =>
            row.id === stallId
              ? {
                  ...row,
                  status,
                  compliant: status === "active",
                  signedUpToday: status === "active" ? row.signedUpToday : false,
                  allottedToday: false,
                  signedUpAt: status === "active" ? row.signedUpAt : 0,
                }
              : row,
          );
          const venue = s.venues.find((v) => v.id === stalls.find((row) => row.id === stallId)?.venueId);
          return {
            ...s,
            stalls: venue ? allocate(stalls, venue) : stalls,
          };
        });
      },
      signUp(stallId, plotId, preference) {
        setSnap((cur) => rules.signUp(cur, stallId, plotId, Date.now(), preference));
      },
      setPlotPreference(stallId, preference) {
        setSnap((cur) => rules.setPlotPreference(cur, stallId, preference));
      },
      claimFreedPlot(stallId, plotId) {
        setSnap((cur) => rules.claimFreedPlot(cur, stallId, plotId));
      },
      isSignupOpen(venueId) {
        const venue = snap.venues.find((v) => v.id === venueId);
        return venue ? rules.signupOpenNow(snap, venue) : false;
      },
      nowMinutes: rules.nowMinutes(snap),
      setDemoMinutes(minutes) {
        setSnap((s) => ({ ...s, demoMinutes: minutes }));
      },
      withdraw(stallId) {
        setSnap((cur) => rules.withdraw(cur, stallId));
      },
      closeSignup(venueId) {
        setSnap((cur) => rules.closeSignup(cur, venueId));
      },
      openNextDay(venueId) {
        setSnap((cur) => rules.openNextDay(cur, venueId));
      },
      markFeePaid(stallId, paid) {
        setSnap((s) => ({
          ...s,
          stalls: s.stalls.map((row) => (row.id === stallId ? { ...row, feePaidThisMonth: paid } : row)),
        }));
      },
      setClosedToday(venueId, closed) {
        setSnap((s) => ({
          ...s,
          venues: s.venues.map((v) => (v.id === venueId ? { ...v, closedToday: closed } : v)),
        }));
      },
      addDish(stallId, name, priceYuan, photo) {
        const label = name.trim();
        if (!label || priceYuan <= 0) return;
        const row: Dish = {
          id: newId("d"),
          stallId,
          name: label,
          priceYuan,
          onTonight: true,
          photo: photo || "",
        };
        setSnap((s) => ({ ...s, dishes: [...s.dishes, row] }));
      },
      setDishPhoto(dishId, photo) {
        setSnap((s) => ({
          ...s,
          dishes: s.dishes.map((d) => (d.id === dishId ? { ...d, photo } : d)),
        }));
      },
      removeDish(dishId) {
        setSnap((s) => ({ ...s, dishes: s.dishes.filter((d) => d.id !== dishId) }));
      },
      toggleDishTonight(dishId) {
        setSnap((s) => ({
          ...s,
          dishes: s.dishes.map((d) => (d.id === dishId ? { ...d, onTonight: !d.onTonight } : d)),
        }));
      },
      recordStallSale(stallId, dishId) {
        setSnap((s) => {
          const stall = s.stalls.find((row) => row.id === stallId);
          const dish = s.dishes.find((d) => d.id === dishId && d.stallId === stallId);
          if (!stall || stall.status !== "active" || !stall.allottedToday || !dish || !dish.onTonight) return s;
          const row: Sale = {
            id: newId("sale"),
            stallId,
            dishName: dish.name,
            priceYuan: dish.priceYuan,
            channel: "stall",
            at: Date.now(),
          };
          return { ...s, sales: [row, ...s.sales] };
        });
      },
      requestOrdering(stallId) {
        setSnap((s) => ({
          ...s,
          stalls: s.stalls.map((row) =>
            row.id === stallId && row.status === "active" && row.licenseTier === "display"
              ? { ...row, orderingRequested: true }
              : row,
          ),
        }));
      },
      reviewOrdering(stallId, allow) {
        setSnap((s) => ({
          ...s,
          stalls: s.stalls.map((row) =>
            row.id === stallId
              ? {
                  ...row,
                  orderingRequested: false,
                  orderingPaused: false,
                  licenseTier: allow ? "ordering" : "display",
                }
              : row,
          ),
        }));
      },
      placeOrder(stallId, picks) {
        const stall = snap.stalls.find((row) => row.id === stallId);
        if (!stall || !canTakeMiniOrder(stall)) return null;
        const items = picks
          .map((pick) => {
            const dish = snap.dishes.find((d) => d.id === pick.dishId && d.stallId === stallId && d.onTonight);
            if (!dish || pick.qty < 1) return null;
            return {
              dishId: dish.id,
              name: dish.name,
              priceYuan: dish.priceYuan,
              qty: Math.min(pick.qty, 20),
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);
        if (items.length === 0) return null;
        const id = newId("o");
        const totalYuan = items.reduce((sum, row) => sum + row.priceYuan * row.qty, 0);
        const at = Date.now();
        setSnap((s) => {
          const pickupNo = String(s.orders.filter((row) => row.stallId === stallId).length + 1).padStart(3, "0");
          const order: Order = {
            id,
            stallId,
            vendorName: stall.vendorName,
            items,
            totalYuan,
            pickupNo,
            slotNo: formatSlotNo(stall.lotSlot),
            status: "placed",
            at,
          };
          const sales: Sale[] = items.map((row) => ({
            id: `sale-${id}-${row.dishId}`,
            stallId,
            dishName: row.qty > 1 ? `${row.name} ×${row.qty}` : row.name,
            priceYuan: row.priceYuan * row.qty,
            channel: "mini",
            at,
          }));
          return { ...s, orders: [order, ...s.orders], sales: [...sales, ...s.sales] };
        });
        return id;
      },
      pauseOrdering(stallId, paused) {
        setSnap((s) => ({
          ...s,
          stalls: s.stalls.map((row) =>
            row.id === stallId && row.licenseTier === "ordering" ? { ...row, orderingPaused: paused } : row,
          ),
        }));
      },
      markOrder(orderId, status) {
        setSnap((cur) => rules.markOrder(cur, orderId, status));
      },
      markArrived(stallId, arrived = true) {
        setSnap((cur) => rules.markArrived(cur, stallId, arrived));
      },
      markPackedUp(stallId) {
        setSnap((cur) => rules.markPackedUp(cur, stallId));
      },
      markNoShow(stallId) {
        setSnap((cur) => rules.markNoShow(cur, stallId));
      },
      addReview(stallId, stars, note, ateHere = false) {
        setSnap((s) => {
          const stall = s.stalls.find((row) => row.id === stallId);
          const score = Math.min(5, Math.max(1, Math.round(stars)));
          if (!stall || !canLeaveReview(stall, s.orders, ateHere)) return s;
          const row: Review = {
            id: newId("r"),
            stallId,
            stars: score,
            note: note.trim() || "到摊吃过。",
            nick: s.consumerName,
            consumerId: s.consumerId,
            at: Date.now(),
          };
          return { ...s, reviews: [row, ...s.reviews] };
        });
      },
      addDispute(stallId, note) {
        const text = note.trim();
        if (!text) return;
        setSnap((s) => {
          const stall = s.stalls.find((row) => row.id === stallId);
          if (!stall) return s;
          const row: Dispute = {
            id: newId("n"),
            stallId,
            vendorName: stall.vendorName,
            note: text,
            at: Date.now(),
          };
          return { ...s, disputes: [row, ...s.disputes] };
        });
      },
      refundOrder(orderId) {
        setSnap((cur) => rules.refundOrder(cur, orderId));
      },
    }),
    [snap, role, hydrated],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}
