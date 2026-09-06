import type { DayRecord, Order } from "./types";

/**
 * 「排 3 单 · 约 6 分钟」和「连续出摊 23 天」这两句话，顾客用来决定要不要走过去。
 * 它们不是新数据，是已经有的单子和留档换个说法，所以就地算，不进快照。
 */

/** Orders still waiting to be handed over at one stall. */
export function stallQueue(orders: Order[], stallId: string) {
  const ahead = orders.filter(
    (row) => row.stallId === stallId && (row.status === "placed" || row.status === "ready"),
  ).length;
  return { ahead, minutes: Math.max(2, ahead * 2) };
}

/** How many of those were placed before this one — the customer's own position. */
export function ordersAhead(orders: Order[], order: Order) {
  return orders.filter(
    (row) =>
      row.stallId === order.stallId &&
      row.id !== order.id &&
      row.at < order.at &&
      (row.status === "placed" || row.status === "ready"),
  ).length;
}

const DAY = 86400000;

function dayBefore(date: string) {
  const at = new Date(`${date}T00:00:00+08:00`).getTime() - DAY;
  return new Date(at + 8 * 3600000).toISOString().slice(0, 10);
}

/**
 * Trading days this stall turned up, counted back without a gap. Today is not
 * filed until the day is closed, so the run is allowed to end yesterday.
 */
export function arrivalStreak(log: DayRecord[], stallId: string, today: string) {
  const showed = new Set(log.filter((row) => row.stallId === stallId && row.arrived).map((row) => row.date));
  const filed = new Set(log.filter((row) => row.stallId === stallId).map((row) => row.date));
  let date = showed.has(today) || !filed.has(today) ? today : "";
  if (!date) return 0;
  if (!showed.has(date)) date = dayBefore(date);
  let days = 0;
  while (showed.has(date)) {
    days += 1;
    date = dayBefore(date);
  }
  return days;
}
