import type { Role } from "./types";

export type AppId = Role;

export type TabIcon =
  | "tonight"
  | "orders"
  | "me"
  | "slot"
  | "menu"
  | "desk"
  | "today"
  | "entry"
  | "license"
  | "flow"
  | "venue";

export type TabSpec = {
  href: string;
  label: string;
  icon: TabIcon;
  badge?: "pending" | "license" | "orders";
  match: (path: string) => boolean;
};

export type MiniAppSpec = {
  id: AppId;
  name: string;
  root: string;
  tabs: TabSpec[];
};

export const APPS: MiniAppSpec[] = [
  {
    id: "consumer",
    name: "顾客端",
    root: "/",
    tabs: [
      {
        href: "/",
        label: "今晚",
        icon: "tonight",
        match: (path) => path === "/" || path.startsWith("/stall/") || path.startsWith("/market/"),
      },
      {
        href: "/orders",
        label: "订单",
        icon: "orders",
        badge: "orders",
        match: (path) => path === "/orders" || path.startsWith("/orders/"),
      },
      { href: "/me", label: "我的", icon: "me", match: (path) => path === "/me" },
    ],
  },
  {
    id: "vendor",
    name: "摊主端",
    root: "/vendor",
    tabs: [
      { href: "/vendor", label: "占位", icon: "slot", match: (path) => path === "/vendor" },
      { href: "/vendor/menu", label: "菜单", icon: "menu", match: (path) => path === "/vendor/menu" },
      {
        href: "/vendor/queue",
        label: "接单",
        icon: "orders",
        badge: "orders",
        match: (path) => path === "/vendor/queue",
      },
      { href: "/vendor/desk", label: "收银", icon: "desk", match: (path) => path === "/vendor/desk" },
      { href: "/vendor/me", label: "我的", icon: "me", match: (path) => path === "/vendor/me" },
    ],
  },
  {
    id: "organizer",
    name: "管场端",
    root: "/org",
    tabs: [
      { href: "/org", label: "今日", icon: "today", match: (path) => path === "/org" },
      {
        href: "/org/entry",
        label: "进场",
        icon: "entry",
        badge: "pending",
        match: (path) => path === "/org/entry",
      },
      {
        href: "/org/license",
        label: "核证",
        icon: "license",
        badge: "license",
        match: (path) => path === "/org/license",
      },
      { href: "/org/flow", label: "流水", icon: "flow", match: (path) => path === "/org/flow" },
      { href: "/org/venue", label: "场子", icon: "venue", match: (path) => path === "/org/venue" },
    ],
  },
];

export function appFromPath(path: string): MiniAppSpec {
  if (path.startsWith("/vendor")) return APPS[1];
  if (path.startsWith("/org")) return APPS[2];
  return APPS[0];
}

export function isStackPage(path: string): boolean {
  return path.startsWith("/stall/") || path.startsWith("/market/") || path === "/org/floor" || /^\/orders\/.+/.test(path);
}

export function titleFromPath(path: string, stallName?: string, pickupNo?: string): string {
  if (path.startsWith("/stall/")) return stallName || "摊位";
  if (path.startsWith("/market/")) return "今晚摊位";
  if (/^\/orders\/.+/.test(path)) return pickupNo ? `取餐 ${pickupNo}` : "取餐号";
  if (path === "/orders") return "订单";
  if (path === "/me") return "我的";
  if (path === "/vendor") return "占位";
  if (path === "/vendor/menu") return "菜单";
  if (path === "/vendor/queue") return "接单";
  if (path === "/vendor/desk") return "收银";
  if (path === "/vendor/me") return "我的";
  if (path === "/org") return "今日";
  if (path === "/org/floor") return "现场";
  if (path === "/org/entry") return "进场";
  if (path === "/org/license") return "核证";
  if (path === "/org/flow") return "流水";
  if (path === "/org/venue") return "场子";
  return "开摊";
}
