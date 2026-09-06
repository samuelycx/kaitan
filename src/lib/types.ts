export type Role = "consumer" | "vendor" | "organizer";

export type TenancyStatus = "pending" | "active" | "rejected";

export type PlotUse = "snack" | "grill" | "fruit" | "service";

export type LotPlot = {
  id: string;
  no: string;
  x: number;
  y: number;
  w: number;
  h: number;
  use: PlotUse;
};

export type VenueFloor = {
  width: number;
  height: number;
  gate: { x: number; y: number; label: string };
  plots: LotPlot[];
};

export type Venue = {
  id: string;
  name: string;
  organizerId: string;
  organizerName: string;
  district: string;
  address: string;
  open: string;
  close: string;
  signupBy: string;
  signupOpen: boolean;
  slots: number;
  feeYuanPerMonth: number;
  note: string;
  closedToday: boolean;
  cover: string;
  floor: VenueFloor;
};

export type LicenseTier = "display" | "ordering";

export type Stall = {
  id: string;
  venueId: string;
  vendorId: string;
  vendorName: string;
  category: string;
  fromStreet: string;
  /** How the organizer reaches this vendor. Asked at registration, never shown to customers. */
  phone: string;
  /** When the vendor registered themselves, so the review queue is oldest-first. */
  appliedAt: number;
  cover: string;
  blurb: string;
  status: TenancyStatus;
  compliant: boolean;
  licenseTier: LicenseTier;
  orderingRequested: boolean;
  orderingPaused: boolean;
  feePaidThisMonth: boolean;
  /** When the organizer marked this month's fee paid, so the ledger can say when. */
  feePaidAt: number;
  signedUpToday: boolean;
  allottedToday: boolean;
  arrivedToday: boolean;
  packedUpToday: boolean;
  noShowToday: boolean;
  signedUpAt: number;
  lotSlot: number;
  lotPlotId: string;
  /** What to do when someone else takes the chosen plot first. */
  plotPreference: PlotPreference;
  /** The plot this stall held last trading day, so sign-up is one tap. */
  lastPlotId: string;
};

/**
 * Decided 2026-09-06: the vendor picks this when signing up, not afterwards.
 * "only" keeps waiting for the exact plot; "any" takes whatever still fits.
 */
export type PlotPreference = "only" | "any";

export type Dish = {
  id: string;
  stallId: string;
  name: string;
  priceYuan: number;
  onTonight: boolean;
  photo: string;
};

export const DISH_PHOTOS = [
  { src: "/dishes/mianjin.jpg", label: "面筋" },
  { src: "/dishes/mianjin-spicy.jpg", label: "辣面筋" },
  { src: "/dishes/lengmian.jpg", label: "烤冷面" },
  { src: "/dishes/egg.jpg", label: "煎蛋" },
  { src: "/dishes/fruit.jpg", label: "水果" },
  { src: "/dishes/bing.jpg", label: "土家饼" },
  { src: "/dishes/chuan.jpg", label: "烤串" },
  { src: "/dishes/tanghulu.jpg", label: "糖葫芦" },
  { src: "/dishes/jianbing.jpg", label: "煎饼" },
  { src: "/dishes/hongshu.jpg", label: "烤红薯" },
] as const;

export function venueCover(venue?: Pick<Venue, "cover"> | null) {
  return venue?.cover || "/stalls/venue.jpg";
}

const COVER_BY_CATEGORY: Record<string, string> = {
  水果: "/stalls/chen.jpg",
  烤串: "/stalls/ma.jpg",
  糖水: "/stalls/tian.jpg",
};

export function stallCover(stall: Pick<Stall, "cover" | "category">) {
  return stall.cover || COVER_BY_CATEGORY[stall.category] || "/stalls/wang.jpg";
}

export function photoByName(name: string) {
  if (name.includes("辣")) return "/dishes/mianjin-spicy.jpg";
  if (name.includes("水果")) return "/dishes/fruit.jpg";
  if (name.includes("冷面")) return "/dishes/lengmian.jpg";
  if (name.includes("蛋")) return "/dishes/egg.jpg";
  if (name.includes("煎饼")) return "/dishes/jianbing.jpg";
  if (name.includes("饼")) return "/dishes/bing.jpg";
  if (name.includes("面筋")) return "/dishes/mianjin.jpg";
  if (name.includes("串") || name.includes("茄")) return "/dishes/chuan.jpg";
  if (name.includes("葫芦") || name.includes("山楂") || name.includes("草莓")) return "/dishes/tanghulu.jpg";
  if (name.includes("薯")) return "/dishes/hongshu.jpg";
  return "/dishes/mianjin.jpg";
}

export function dishPhoto(dish: Pick<Dish, "name" | "photo">) {
  return dish.photo || photoByName(dish.name);
}

export function orderThumb(order: { items: { dishId: string; name: string }[] }, dishes: Dish[]) {
  const first = order.items[0];
  if (!first) return "/dishes/mianjin.jpg";
  const dish = dishes.find((d) => d.id === first.dishId);
  return dish ? dishPhoto(dish) : photoByName(first.name);
}

export { tonightBooths } from "./lot";

export type Sale = {
  id: string;
  stallId: string;
  dishName: string;
  priceYuan: number;
  channel: "stall" | "mini";
  at: number;
};

export type OrderStatus = "placed" | "ready" | "picked" | "refunded";

export type OrderLine = {
  dishId: string;
  name: string;
  priceYuan: number;
  qty: number;
};

export type Order = {
  id: string;
  stallId: string;
  vendorName: string;
  items: OrderLine[];
  totalYuan: number;
  pickupNo: string;
  slotNo: string;
  status: OrderStatus;
  at: number;
};

export const ORDER_STATUS: Record<OrderStatus, string> = {
  placed: "待出餐",
  ready: "请到摊取",
  picked: "已取",
  refunded: "已退",
};

export type Dispute = {
  id: string;
  stallId: string;
  vendorName: string;
  note: string;
  at: number;
};

export type Review = {
  id: string;
  stallId: string;
  consumerId?: string;
  /** The ticket this review is attached to. Absent means the customer said so themselves. */
  orderId?: string;
  /** True when a collected ticket backs it up, so the average can say how many are checkable. */
  verified: boolean;
  stars: number;
  note: string;
  nick: string;
  at: number;
};

export function stallRating(reviews: Review[], stallId: string) {
  const rows = reviews.filter((row) => row.stallId === stallId);
  if (rows.length === 0) return { avg: 0, count: 0, verified: 0 };
  const avg = Math.round((rows.reduce((sum, row) => sum + row.stars, 0) / rows.length) * 10) / 10;
  return { avg, count: rows.length, verified: rows.filter((row) => row.verified).length };
}

/**
 * The number that decides who picks a plot first. A raw average lets one
 * five-star review outrank a stall with fifty, and it would shut a new stall
 * out of the market on its first night — so every stall starts held at 4.0 and
 * only moves as reviews accumulate. Reviews backed by a collected ticket count
 * double; anyone can claim they ate somewhere.
 */
export const RATING_BASELINE = 4;
const BASELINE_WEIGHT = 6;

export function stallScore(reviews: Review[], stallId: string) {
  const rows = reviews.filter((row) => row.stallId === stallId);
  const weight = (row: Review) => (row.verified ? 2 : 1);
  const total = rows.reduce((sum, row) => sum + row.stars * weight(row), RATING_BASELINE * BASELINE_WEIGHT);
  const count = rows.reduce((sum, row) => sum + weight(row), BASELINE_WEIGHT);
  return Math.round((total / count) * 100) / 100;
}

export function ratingLabel(reviews: Review[], stallId: string) {
  const { avg, count } = stallRating(reviews, stallId);
  return count > 0 ? `${avg} · ${count}评` : "还没人评";
}

/**
 * Where a stall is right now, from the customer's point of view. Signing up is
 * not the same as standing behind the counter, so the list has to say which.
 */
export type BoothState = "waiting" | "open" | "packed";

export function boothState(stall: Pick<Stall, "arrivedToday" | "packedUpToday">): BoothState {
  if (stall.packedUpToday) return "packed";
  return stall.arrivedToday ? "open" : "waiting";
}

export const BOOTH_STATE_LABEL: Record<BoothState, string> = {
  waiting: "还没开摊",
  open: "已开摊",
  packed: "已收摊",
};

export function canTakeMiniOrder(stall: Stall) {
  return (
    stall.status === "active" &&
    stall.allottedToday &&
    boothState(stall) === "open" &&
    stall.licenseTier === "ordering" &&
    !stall.orderingPaused
  );
}

/** A mainland mobile number, which is the only contact the organizer needs. */
export function isPhone(text: string) {
  return /^1[3-9]\d{9}$/.test(text.trim());
}

export function stallPayLabel(stall: Stall) {
  if (stall.licenseTier !== "ordering") return "到摊付";
  if (stall.orderingPaused) return "暂停接单";
  return "可点单";
}

/**
 * One stall on one trading day, written when the organizer opens the next day.
 * Only the four things the organizer actually has to answer for are kept —
 * signed up, turned up, stood the venue up, and took money. Nothing about
 * stock or cost: this is a record of attendance, not a set of books.
 */
export type DayRecord = {
  id: string;
  /** Trading day in CST, as 2026-09-06. */
  date: string;
  venueId: string;
  stallId: string;
  vendorName: string;
  signedUp: boolean;
  allotted: boolean;
  arrived: boolean;
  noShow: boolean;
  plotNo: string;
  /** Plots the venue had that day, so old days stay readable if the map changes. */
  plotsThatDay: number;
  salesYuan: number;
  saleCount: number;
};

const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

/** The trading day an instant falls on, in CST, as 2026-09-06. */
/** Clock time in CST, which is the only clock the venue runs on. */
export function cstTime(at: number) {
  return new Date(at).toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function cstDate(at: number) {
  return new Date(at + CST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The day after a CST date string. */
export function nextDate(date: string) {
  const at = Date.parse(`${date}T00:00:00Z`);
  return new Date(at + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 2026-09-06 as 09-06, which is how the organizer says it out loud. */
export function shortDate(date: string) {
  return date.slice(5);
}

/** The month a CST date falls in, as 2026-09. */
export function monthOf(date: string) {
  return date.slice(0, 7);
}

export type Snapshot = {
  venues: Venue[];
  stalls: Stall[];
  dishes: Dish[];
  sales: Sale[];
  orders: Order[];
  disputes: Dispute[];
  reviews: Review[];
  vendorId: string;
  vendorName: string;
  organizerId: string;
  organizerName: string;
  consumerId: string;
  consumerName: string;
  /** Stalls this customer asked to be told about when they light up. */
  follows: string[];
  /**
   * Demo clock, in minutes past midnight. The prototype has no server, so the
   * cutoff would only ever fire at the real 15:00; this lets a demo move the
   * day along. `null` means follow the real clock.
   */
  demoMinutes: number | null;
  /** The trading day now in progress, in CST. */
  tradingDate: string;
  /** When that day began, so the day's takings can be told from earlier ones. */
  dayStartedAt: number;
  /** Closed trading days. Opening the next day appends here, never overwrites. */
  dayLog: DayRecord[];
};
