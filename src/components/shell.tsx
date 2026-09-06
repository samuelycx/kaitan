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
  const pickupNo = orders.find((row) => row.id === orderId)?.pickupNo;
  const title = titleFromPath(pathname, stallName, pickupNo);
  const pendingCount = stalls.filter((s) => s.status === "pending").length;
  const licenseCount = stalls.filter((s) => s.licenseTier !== "ordering" && s.orderingRequested).length;
  const liveOrders = orders.filter((row) => row.status === "placed" || row.status === "ready");
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
          {/* 状态栏只有时间和信号电量，胶囊按钮在导航栏那一行——微信就是这么排的。 */}
          <header className="mp-status">
            <span className="mp-clock">{clock}</span>
            <svg className="mp-signal" viewBox="0 0 68 12" aria-hidden>
              <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
              <rect x="4.5" y="5.5" width="3" height="6.5" rx="1" />
              <rect x="9" y="3" width="3" height="9" rx="1" />
              <rect x="13.5" y="0.5" width="3" height="11.5" rx="1" />
              <path
                d="M22 4.2a9 9 0 0 1 11 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M24.6 7.2a5.2 5.2 0 0 1 5.8 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="27.5" cy="10.2" r="1.3" />
              <rect x="40" y="1.5" width="22" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
              <rect x="41.8" y="3.3" width="15" height="6.4" rx="1.6" />
              <path d="M63.6 5a2.4 2.4 0 0 1 0 4z" opacity="0.5" />
            </svg>
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
            <span className="mp-capsule" aria-hidden>
              <svg viewBox="0 0 20 4">
                <circle cx="2.4" cy="2" r="1.8" />
                <circle cx="10" cy="2" r="1.8" />
                <circle cx="17.6" cy="2" r="1.8" />
              </svg>
              <i />
              <svg viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="9" cy="9" r="2.4" />
              </svg>
            </span>
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
