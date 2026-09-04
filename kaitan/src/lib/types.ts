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
  cover: string;
  blurb: string;
  status: TenancyStatus;
  compliant: boolean;
  licenseTier: LicenseTier;
  orderingRequested: boolean;
  orderingPaused: boolean;
  feePaidThisMonth: boolean;
  signedUpToday: boolean;
  allottedToday: boolean;
  arrivedToday: boolean;
  noShowToday: boolean;
  signedUpAt: number;
  lotSlot: number;
  lotPlotId: string;
};

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

export function stallCover(stall: Pick<Stall, "id" | "cover" | "category">) {
  if (stall.cover) return stall.cover;
  if (stall.id === "s-lin") return "/stalls/lin.jpg";
  if (stall.id === "s-2") return "/stalls/liu.jpg";
  if (stall.id === "s-3" || stall.category === "水果") return "/stalls/chen.jpg";
  if (stall.id === "s-5") return "/stalls/ma.jpg";
  if (stall.id === "s-6") return "/stalls/tian.jpg";
  if (stall.id === "s-7") return "/stalls/fu.jpg";
  if (stall.id === "s-8") return "/stalls/zhen.jpg";
  return "/stalls/wang.jpg";
}

export function dishPhoto(dish: Pick<Dish, "id" | "name" | "photo">) {
  if (dish.photo) return dish.photo;
  if (dish.id === "d-2" || dish.name.includes("辣")) return "/dishes/mianjin-spicy.jpg";
  if (dish.id === "d-3" || dish.name.includes("水果")) return "/dishes/fruit.jpg";
  if (dish.id === "d-4" || dish.name.includes("冷面")) return "/dishes/lengmian.jpg";
  if (dish.id === "d-5" || dish.name.includes("蛋")) return "/dishes/egg.jpg";
  if (dish.name.includes("煎饼")) return "/dishes/jianbing.jpg";
  if (dish.name.includes("饼")) return "/dishes/bing.jpg";
  if (dish.name.includes("串") || dish.name.includes("茄")) return "/dishes/chuan.jpg";
  if (dish.name.includes("葫芦") || dish.name.includes("山楂") || dish.name.includes("草莓")) return "/dishes/tanghulu.jpg";
  if (dish.name.includes("薯")) return "/dishes/hongshu.jpg";
  return "/dishes/mianjin.jpg";
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
  stars: number;
  note: string;
  nick: string;
  at: number;
};

export function stallRating(reviews: Review[] | undefined, stallId: string) {
  const rows = (reviews ?? []).filter((row) => row.stallId === stallId);
  if (rows.length === 0) return { avg: 0, count: 0 };
  const avg = rows.reduce((sum, row) => sum + row.stars, 0) / rows.length;
  return { avg: Math.round(avg * 10) / 10, count: rows.length };
}

export function ratingLabel(reviews: Review[] | undefined, stallId: string) {
  const { avg, count } = stallRating(reviews, stallId);
  return count > 0 ? `${avg} · ${count}评` : "还没人评";
}

export function canTakeMiniOrder(stall: Stall) {
  return (
    stall.status === "active" &&
    stall.allottedToday &&
    stall.licenseTier === "ordering" &&
    !stall.orderingPaused
  );
}

export function stallPayLabel(stall: Stall) {
  if (stall.licenseTier !== "ordering") return "到摊付";
  if (stall.orderingPaused) return "暂停接单";
  return "可点单";
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
};
