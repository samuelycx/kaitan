"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Btn, Card, CardHead, Cell, Empty, LotMap, Page } from "@/components/mp";
import { canLeaveReview } from "@/lib/lot";
import { useStore } from "@/lib/store";
import { ORDER_STATUS, dishPhoto, orderThumb, stallCover, tonightBooths } from "@/lib/types";

function pickupShare(order: {
  vendorName: string;
  pickupNo: string;
  slotNo?: string;
  totalYuan: number;
  status: keyof typeof ORDER_STATUS;
  items: { name: string; qty: number }[];
}) {
  const slot = order.slotNo && order.slotNo !== "—" ? `${order.slotNo}号摊 · ` : "";
  return `开摊取餐 ${order.pickupNo} · ${slot}${order.vendorName} · ${order.items.map((item) => `${item.name}×${item.qty}`).join(" ")} · ${order.totalYuan}元 · ${ORDER_STATUS[order.status]}`;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { venues, orders, dishes, stalls, addReview } = useStore();
  const [copied, setCopied] = useState(false);
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState("");
  const order = (orders ?? []).find((row) => row.id === id);
  const stall = stalls.find((s) => s.id === order?.stallId);
  const venue = venues.find((row) => row.id === stall?.venueId);
  const booth = tonightBooths(stalls, venues.find((row) => row.id === stall?.venueId)?.floor ?? venues[0]?.floor).find(
    (row) => row.stall.id === stall?.id,
  );
  const slotNo = order?.slotNo && order.slotNo !== "—" ? order.slotNo : booth?.slotNo ?? "—";

  if (!order) {
    return (
      <Page>
        <Card>
          <Empty>这张单找不到。</Empty>
        </Card>
      </Page>
    );
  }

  const ticket = order;

  async function copyPickup() {
    const text = pickupShare({ ...ticket, slotNo });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Page>
      <div className="pickup-ticket">
        <img src={stall ? stallCover(stall) : orderThumb(order, dishes)} alt="" />
        <div className="pickup-body">
          <p>
            取餐号 · {slotNo}号摊 · {order.vendorName}
          </p>
          <strong>{order.pickupNo}</strong>
          <p className="stamp">{ORDER_STATUS[order.status]}</p>
        </div>
      </div>
      <Card>
        {order.items.map((item) => {
          const dish = dishes.find((d) => d.id === item.dishId);
          return (
            <Cell
              key={item.dishId}
              thumb={dish ? dishPhoto(dish) : orderThumb({ items: [item] }, dishes)}
              end={`${item.priceYuan * item.qty} 元`}
            >
              <p>
                {item.name} ×{item.qty}
              </p>
            </Cell>
          );
        })}
        <Cell end={`${order.totalYuan} 元`}>
          <p>合计</p>
        </Cell>
      </Card>
      <Card>
        <Cell
          end={
            <Btn kind="ink" onClick={copyPickup}>
              {copied ? "已复制" : "复制取餐号"}
            </Btn>
          }
        >
          <p>给摊上看这张号</p>
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            {order.status === "refunded"
              ? "这张单已退。货款在该摊商户里处理。"
              : `${slotNo}号摊，从场口往里对着格子找。货款记到该摊商户。到摊取，不配送。`}
          </p>
        </Cell>
        <Cell>
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">{pickupShare({ ...order, slotNo })}</p>
        </Cell>
      </Card>
      {venue && stall && order.status !== "refunded" && (
        <Card>
          <p className="px-3.5 pt-3 text-[13px] text-[var(--muted)]">
            {slotNo}号摊 · {venue.address} · 从场口对着红框找
          </p>
          <LotMap
            floor={venue.floor}
            highlightId={stall.id}
            hrefFor={(sid) => `/stall/${sid}`}
            booths={tonightBooths(
              stalls.filter((row) => row.venueId === venue.id),
              venue.floor,
            ).map(({ stall: row, slotNo: no, plot }) => ({
              slotNo: no,
              cover: stallCover(row),
              name: row.vendorName,
              stallId: row.id,
              plotId: plot?.id || row.lotPlotId,
            }))}
          />
        </Card>
      )}
      {stall && order.status === "picked" && canLeaveReview(stall, orders ?? [], false) && (
        <Card>
          <CardHead>取过了，评一句</CardHead>
          <form
            className="space-y-2 px-3.5 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              addReview(stall.id, stars, note, false);
              setNote("");
            }}
          >
            <div className="stars" aria-label="星级">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={n <= stars ? "is-on" : undefined} onClick={() => setStars(n)}>
                  ★
                </button>
              ))}
            </div>
            <input
              className="mp-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="口味、出餐、好不好找摊"
            />
            <Btn kind="ink" type="submit">
              写下点评
            </Btn>
          </form>
        </Card>
      )}
    </Page>
  );
}
