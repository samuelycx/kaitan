"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { APPS, appFromPath, isStackPage, titleFromPath } from "@/lib/app-nav";
import { useStore } from "@/lib/store";
import { TabIconSvg } from "./tab-icon";

export function Shell({ children }: { children: ReactNode }) {
  const { hydrated, stalls, orders, vendorId, setRole } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const app = appFromPath(pathname);
  const stacked = isStackPage(pathname);
  const stallId = pathname.startsWith("/stall/") ? pathname.slice("/stall/".length) : "";
  const stallName = stalls.find((s) => s.id === stallId)?.vendorName;
  const orderId = pathname.startsWith("/orders/") ? pathname.slice("/orders/".length) : "";
  const pickupNo = (orders ?? []).find((row) => row.id === orderId)?.pickupNo;
  const title = titleFromPath(pathname, stallName, pickupNo);
  const pendingCount = stalls.filter((s) => s.status === "pending").length;
  const licenseCount = stalls.filter((s) => s.licenseTier !== "ordering" && s.orderingRequested).length;
  const liveOrders = (orders ?? []).filter((row) => row.status === "placed" || row.status === "ready");
  const myStallId = stalls.find((s) => s.vendorId === vendorId)?.id;
  const orderBadge = app.id === "vendor" ? liveOrders.filter((row) => row.stallId === myStallId).length : liveOrders.length;
  const [clock, setClock] = useState("18:20");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="desk">
      <nav className="app-switch" aria-label="演示三个小程序">
        <p>演示 · 三个小程序</p>
        <div>
          {APPS.map((item) => (
            <Link
              key={item.id}
              href={item.root}
              onClick={() => setRole(item.id)}
              className={item.id === app.id ? "is-on" : undefined}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </nav>
      <div className="phone">
        <div className="phone-glass">
          <header className="mp-status">
            <span>{clock}</span>
            <span className="mp-capsule" aria-hidden>
              <i />
              <b />
            </span>
            <span className="mp-signal">
              <em />
              <em />
              <em />
              <small />
            </span>
          </header>
          <div className="mp-nav">
            {stacked ? (
              <button type="button" className="mp-back" onClick={() => router.back()} aria-label="返回">
                ‹
              </button>
            ) : (
              <span className="mp-back-slot" />
            )}
            <h1>{title}</h1>
            <span className="mp-nav-app">{app.name}</span>
          </div>
          <main className="mp-page">{hydrated ? children : null}</main>
          {!stacked && (
            <nav className="mp-tabs" aria-label={app.name}>
              {app.tabs.map((tab) => {
                const on = tab.match(pathname);
                const badge =
                  tab.badge === "pending"
                    ? pendingCount
                    : tab.badge === "license"
                      ? licenseCount
                      : tab.badge === "orders"
                        ? orderBadge
                        : 0;
                return (
                  <Link key={tab.href} href={tab.href} className={on ? "is-on" : undefined}>
                    <span className="mp-tab-icon">
                      <TabIconSvg name={tab.icon} />
                      {badge > 0 && <i>{badge > 9 ? "9+" : badge}</i>}
                    </span>
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
