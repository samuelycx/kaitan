"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { canLeaveReview, claimPlots, findPlot, formatSlotNo, plotByNo, plotFits } from "./lot";
import { SEED } from "./seed";
import type { Dish, Dispute, Order, OrderStatus, Review, Role, Sale, Snapshot, Stall, Venue } from "./types";

const KEY = "kaitan-vendor-v2";

function allocate(stalls: Stall[], venue: Venue): Stall[] {
  return claimPlots(stalls, venue);
}

type Store = Snapshot & {
  hydrated: boolean;
  role: Role;
  setRole: (role: Role) => void;
  apply: (venueId: string, category: string, fromStreet: string) => void;
  review: (stallId: string, status: "active" | "rejected") => void;
  signUp: (stallId: string, plotId?: string) => void;
  withdraw: (stallId: string) => void;
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
  markArrived: (stallId: string) => void;
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
      disputes: parsed.disputes ?? [],
      reviews: parsed.reviews ?? SEED.reviews,
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
            noShowToday: row.noShowToday ?? false,
            cover: row.cover || seeded?.cover || "",
            blurb: row.blurb || seeded?.blurb || "",
            category: row.id === "s-5" ? "烤串" : row.category,
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

  const value = useMemo<Store>(
    () => ({
      ...snap,
      dishes: snap.dishes ?? [],
      sales: snap.sales ?? [],
      orders: snap.orders ?? [],
      disputes: snap.disputes ?? [],
      reviews: snap.reviews ?? [],
      hydrated,
      role,
      setRole,
      apply(venueId, category, fromStreet) {
        if (snap.stalls.some((s) => s.venueId === venueId && s.vendorId === snap.vendorId)) return;
        const row: Stall = {
          id: `s-${Date.now()}`,
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
          noShowToday: false,
          signedUpAt: 0,
          lotSlot: 0,
          lotPlotId: "",
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
      signUp(stallId, plotId) {
        setSnap((s) => {
          const target = s.stalls.find((row) => row.id === stallId);
          const venue = s.venues.find((v) => v.id === target?.venueId);
          if (!target || !venue || !venue.signupOpen || target.status !== "active") return s;
          const plot = plotId ? findPlot(venue.floor, plotId) : findPlot(venue.floor, target.lotPlotId);
          if (plotId && (!plot || !plotFits(target.category, plot))) return s;
          const stalls = s.stalls.map((row) =>
            row.id === stallId
              ? {
                  ...row,
                  signedUpToday: true,
                  signedUpAt: row.signedUpAt || Date.now(),
                  lotPlotId: plot?.id || row.lotPlotId,
                  lotSlot: plot ? Number(plot.no) : row.lotSlot,
                }
              : row,
          );
          return { ...s, stalls: allocate(stalls, venue) };
        });
      },
      withdraw(stallId) {
        setSnap((s) => {
          const target = s.stalls.find((row) => row.id === stallId);
          const venue = s.venues.find((v) => v.id === target?.venueId);
          if (!target || !venue || !venue.signupOpen) return s;
          const stalls = s.stalls.map((row) =>
            row.id === stallId
              ? {
                  ...row,
                  signedUpToday: false,
                  allottedToday: false,
                  signedUpAt: 0,
                  arrivedToday: false,
                  lotSlot: 0,
                  lotPlotId: "",
                }
              : row,
          );
          return { ...s, stalls: allocate(stalls, venue) };
        });
      },
      closeSignup(venueId) {
        setSnap((s) => {
          const venue = s.venues.find((v) => v.id === venueId);
          if (!venue) return s;
          return {
            ...s,
            venues: s.venues.map((v) => (v.id === venueId ? { ...v, signupOpen: false } : v)),
            stalls: allocate(s.stalls, venue),
          };
        });
      },
      openNextDay(venueId) {
        setSnap((s) => ({
          ...s,
          venues: s.venues.map((v) => (v.id === venueId ? { ...v, signupOpen: true, closedToday: false } : v)),
          stalls: s.stalls.map((row) =>
            row.venueId === venueId
              ? {
                  ...row,
                  signedUpToday: false,
                  allottedToday: false,
                  signedUpAt: 0,
                  arrivedToday: false,
                  noShowToday: false,
                  lotSlot: 0,
                  lotPlotId: "",
                }
              : row,
          ),
        }));
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
          id: `d-${Date.now()}`,
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
        const stall = snap.stalls.find((row) => row.id === stallId);
        const dish = snap.dishes.find((d) => d.id === dishId && d.stallId === stallId);
        if (!stall || stall.status !== "active" || !stall.allottedToday || !dish || !dish.onTonight) return;
        const row: Sale = {
          id: `sale-${Date.now()}`,
          stallId,
          dishName: dish.name,
          priceYuan: dish.priceYuan,
          channel: "stall",
          at: Date.now(),
        };
        setSnap((s) => ({ ...s, sales: [row, ...s.sales] }));
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
        if (!stall || stall.status !== "active" || !stall.allottedToday || stall.licenseTier !== "ordering" || stall.orderingPaused) {
          return null;
        }
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
        const id = `o-${Date.now()}`;
        const totalYuan = items.reduce((sum, row) => sum + row.priceYuan * row.qty, 0);
        const pickupNo = String((snap.orders ?? []).filter((row) => row.stallId === stallId).length + 1).padStart(3, "0");
        const order: Order = {
          id,
          stallId,
          vendorName: stall.vendorName,
          items,
          totalYuan,
          pickupNo,
          slotNo: formatSlotNo(stall.lotSlot),
          status: "placed",
          at: Date.now(),
        };
        const sales: Sale[] = items.map((row) => ({
          id: `sale-${id}-${row.dishId}`,
          stallId,
          dishName: row.qty > 1 ? `${row.name} ×${row.qty}` : row.name,
          priceYuan: row.priceYuan * row.qty,
          channel: "mini",
          at: order.at,
        }));
        setSnap((s) => ({ ...s, orders: [order, ...(s.orders ?? [])], sales: [...sales, ...s.sales] }));
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
        setSnap((s) => {
          const current = (s.orders ?? []).find((row) => row.id === orderId);
          if (!current) return s;
          const allowed =
            (current.status === "placed" && status === "ready") || (current.status === "ready" && status === "picked");
          if (!allowed) return s;
          return {
            ...s,
            orders: s.orders.map((row) => (row.id === orderId ? { ...row, status } : row)),
          };
        });
      },
      markArrived(stallId) {
        setSnap((s) => ({
          ...s,
          stalls: s.stalls.map((row) =>
            row.id === stallId && row.allottedToday
              ? { ...row, arrivedToday: true, noShowToday: false }
              : row,
          ),
        }));
      },
      markNoShow(stallId) {
        setSnap((s) => {
          const target = s.stalls.find((row) => row.id === stallId);
          const venue = s.venues.find((v) => v.id === target?.venueId);
          if (!target || !venue || !target.allottedToday) return s;
          const live = (s.orders ?? []).some(
            (row) => row.stallId === stallId && (row.status === "placed" || row.status === "ready"),
          );
          if (live) return s;
          const stalls = s.stalls.map((row) =>
            row.id === stallId
              ? {
                  ...row,
                  signedUpToday: false,
                  allottedToday: false,
                  signedUpAt: 0,
                  arrivedToday: false,
                  noShowToday: true,
                  lotSlot: 0,
                  lotPlotId: "",
                }
              : row,
          );
          return { ...s, stalls: allocate(stalls, venue) };
        });
      },
      addReview(stallId, stars, note, ateHere = false) {
        const stall = snap.stalls.find((row) => row.id === stallId);
        const score = Math.min(5, Math.max(1, Math.round(stars)));
        if (!stall || !canLeaveReview(stall, snap.orders ?? [], ateHere)) return;
        const row: Review = {
          id: `r-${Date.now()}`,
          stallId,
          stars: score,
          note: note.trim() || "到摊吃过。",
          nick: "路过的人",
          at: Date.now(),
        };
        setSnap((s) => ({ ...s, reviews: [row, ...(s.reviews ?? [])] }));
      },
      addDispute(stallId, note) {
        const text = note.trim();
        const stall = snap.stalls.find((row) => row.id === stallId);
        if (!text || !stall) return;
        const row: Dispute = {
          id: `n-${Date.now()}`,
          stallId,
          vendorName: stall.vendorName,
          note: text,
          at: Date.now(),
        };
        setSnap((s) => ({ ...s, disputes: [row, ...(s.disputes ?? [])] }));
      },
      refundOrder(orderId) {
        setSnap((s) => {
          const current = (s.orders ?? []).find((row) => row.id === orderId);
          if (!current || current.status === "picked" || current.status === "refunded") return s;
          return {
            ...s,
            orders: s.orders.map((row) => (row.id === orderId ? { ...row, status: "refunded" } : row)),
          };
        });
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
