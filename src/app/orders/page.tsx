"use client";

import Link from "next/link";
import { useState } from "react";
import { Band, Empty, Page, PlotChip } from "@/components/mp";
import { ordersAhead } from "@/lib/queue";
import { useStore } from "@/lib/store";
import { ORDER_STATUS, orderThumb, shortDate, cstDate } from "@/lib/types";

/**
 * 我的单。手里还没取的那张排在最上面，占一整块，因为它是现在要用的东西；
 * 吃过的往下排成一列，每行右边留一个「再来一单」的口子。
 */
export default function OrdersPage() {
  const { orders, dishes, stalls } = useStore();
  const [tab, setTab] = useState<"live" | "done">("live");
  const live = orders.filter((row) => row.status === "placed" || row.status === "ready");
  const done = orders.filter((row) => row.status === "picked" || row.status === "refunded");
  const showing = tab === "live" ? live : done;

  return (
    <Page>
      <header className="tonight-head">
        <h2>我的单</h2>
        <div className="tabs-line">
          <button type="button" className={tab === "live" ? "is-on" : undefined} onClick={() => setTab("live")}>
            进行中 {live.length}
          </button>
          <button type="button" className={tab === "done" ? "is-on" : undefined} onClick={() => setTab("done")}>
            吃过的 {done.length}
          </button>
        </div>
      </header>
      {showing.length === 0 ? (
        <Empty>{tab === "live" ? "手里没有待取的单。" : "还没吃过。点一单试试。"}</Empty>
      ) : tab === "live" ? (
        live.map((row) => {
          const ahead = ordersAhead(orders, row);
          return (
            <Link key={row.id} href={`/orders/${row.id}`} className="live-order">
              <div className="live-order-head">
                <span className="live-order-no">{row.pickupNo}</span>
                <div className="live-order-who">
                  <p>
                    {row.vendorName} <PlotChip no={row.slotNo || "—"} />
                  </p>
                  <small>{ahead > 0 ? `前面还有 ${ahead} 单 · 约 ${ahead * 2} 分钟` : "马上就轮到"}</small>
                </div>
                <span className="live-order-tag">{ORDER_STATUS[row.status]}</span>
              </div>
              <div className="live-order-foot">
                <span>{row.items.map((item) => `${item.name} × ${item.qty}`).join("、")}</span>
                <strong>{row.totalYuan} 元</strong>
              </div>
            </Link>
          );
        })
      ) : (
        <>
          <Band title="吃过的" />
          {done.map((row) => {
            const stall = stalls.find((s) => s.id === row.stallId);
            return (
              <div key={row.id} className="past-order">
                <img src={orderThumb(row, dishes)} alt="" />
                <div className="past-order-body">
                  <p>{row.vendorName}</p>
                  <small>
                    {shortDate(cstDate(row.at))} · {row.items.map((item) => `${item.name} × ${item.qty}`).join("、")}
                  </small>
                </div>
                <div className="past-order-end">
                  <p>{row.totalYuan} 元</p>
                  {stall && stall.allottedToday ? (
                    <Link href={`/stall/${stall.id}`}>再来一单</Link>
                  ) : (
                    <small>{row.status === "refunded" ? "已退" : "今晚没出"}</small>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </Page>
  );
}
