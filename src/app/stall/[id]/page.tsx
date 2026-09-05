"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Btn, Card, CardHead, Cell, Empty, Page } from "@/components/mp";
import { useStore } from "@/lib/store";
import { canLeaveReview } from "@/lib/lot";
import { canTakeMiniOrder, dishPhoto, ratingLabel, stallCover, stallPayLabel, tonightBooths } from "@/lib/types";

export default function StallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { venues, stalls, dishes, reviews, orders, placeOrder, addReview } = useStore();
  const stall = stalls.find((s) => s.id === id);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState("");
  const [ateHere, setAteHere] = useState(false);

  const menu = useMemo(
    () => dishes.filter((d) => d.stallId === stall?.id && d.onTonight),
    [dishes, stall?.id],
  );
  const booth = tonightBooths(stalls, venues[0]?.floor).find((row) => row.stall.id === stall?.id);

  if (!stall || stall.status !== "active" || !stall.allottedToday) {
    return (
      <Page>
        <Card>
          <Empty>这个摊今晚没有位，或已经收摊。</Empty>
        </Card>
      </Page>
    );
  }

  const canOrder = canTakeMiniOrder(stall);
  const canReview = canLeaveReview(stall, orders ?? [], ateHere);
  const paused = stall.licenseTier === "ordering" && stall.orderingPaused;
  const picks = menu
    .map((d) => ({ dishId: d.id, qty: qty[d.id] ?? 0, name: d.name, priceYuan: d.priceYuan }))
    .filter((row) => row.qty > 0);
  const total = picks.reduce((sum, row) => sum + row.priceYuan * row.qty, 0);

  function bump(dishId: string, delta: number) {
    setQty((cur) => {
      const next = Math.min(20, Math.max(0, (cur[dishId] ?? 0) + delta));
      return { ...cur, [dishId]: next };
    });
  }

  const shop = stall;

  function submit() {
    const orderId = placeOrder(
      shop.id,
      picks.map((row) => ({ dishId: row.dishId, qty: row.qty })),
    );
    if (orderId) router.push(`/orders/${orderId}`);
  }

  return (
    <Page>
      <div className="stall-hero">
        <img src={stallCover(stall)} alt="" />
        <span className="stall-plaque">{booth?.slotNo ?? "—"}</span>
        <span className="stamp stall-poster-stamp">{stallPayLabel(stall)}</span>
      </div>
      <header className="px-0.5 pt-3">
        <p className="text-[11px] tracking-[0.18em] text-[var(--lacquer)]">{stall.category}</p>
        <h2 className="mt-1 font-display text-[1.65rem] leading-none">{stall.vendorName}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
          {stall.blurb || stall.fromStreet} · {ratingLabel(reviews, stall.id)}
        </p>
      </header>
      <Card>
        {menu.length === 0 ? (
          <Empty>今晚菜单还没写上。</Empty>
        ) : (
          menu.map((d) => (
            <div key={d.id} className="dish-row">
              <img src={dishPhoto(d)} alt="" />
              <div className="min-w-0 flex-1">
                <p>{d.name}</p>
                <p className="text-[13px] text-[var(--muted)]">{d.priceYuan} 元</p>
              </div>
              {canOrder ? (
                <span className="mp-step">
                  <button type="button" onClick={() => bump(d.id, -1)} aria-label="减">
                    −
                  </button>
                  <em>{qty[d.id] ?? 0}</em>
                  <button type="button" onClick={() => bump(d.id, 1)} aria-label="加">
                    +
                  </button>
                </span>
              ) : null}
            </div>
          ))
        )}
      </Card>
      <Card>
        <Cell
          end={
            <Btn
              kind="ink"
              onClick={async () => {
                const venue = venues.find((v) => v.id === stall.venueId);
                const menuText = menu.map((d) => `${d.name} ${d.priceYuan}元`).join(" · ");
                const text = `开摊 · ${venue?.name ?? ""} · ${booth?.slotNo ?? "—"}号 ${stall.vendorName}${menuText ? ` · ${menuText}` : ""} · ${stallPayLabel(stall)} · 到摊取不配送`;
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "已复制" : "分享这摊"}
            </Btn>
          }
        >
          <p>发给朋友</p>
          <p className="text-[13px] text-[var(--muted)]">今晚菜单 · 到摊取</p>
        </Cell>
      </Card>
      <Card>
        <CardHead>到摊吃过再评</CardHead>
        {canReview ? (
          <form
            className="space-y-2 px-3.5 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              addReview(stall.id, stars, note, ateHere);
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
        ) : stall.licenseTier === "ordering" ? (
          <Empty>取过餐再评。打开取餐票。</Empty>
        ) : (
          <div className="px-3.5 py-3">
            <Btn kind="ink" onClick={() => setAteHere(true)}>
              我到摊吃过了
            </Btn>
          </div>
        )}
        {(reviews ?? []).filter((row) => row.stallId === stall.id).length === 0 ? (
          <Empty>还没人评。吃过再写。</Empty>
        ) : (
          (reviews ?? [])
            .filter((row) => row.stallId === stall.id)
            .map((row) => (
              <Cell key={row.id} end={`${row.stars} 星`}>
                <p>{row.nick}</p>
                <p className="text-[13px] text-[var(--muted)]">{row.note}</p>
              </Cell>
            ))
        )}
      </Card>
      {canOrder ? (
        <div className="ticket flex items-center justify-between gap-3 px-3.5 py-3">
          <div>
            <p className="text-[13px] text-[var(--muted)]">一单一摊 · 到摊取</p>
            <p className="font-display text-2xl leading-none">{total} 元</p>
          </div>
          <Btn kind="lacquer" disabled={picks.length === 0} onClick={submit}>
            下单
          </Btn>
        </div>
      ) : (
        <Card>
          <Cell>
            <p className="text-[13px] leading-relaxed text-[var(--muted)]">
              {paused
                ? "管场暂停了这个摊的小程序接单。到摊点、到摊付。"
                : "这个摊还不能在小程序收款。到摊点、到摊付。"}
            </p>
          </Cell>
        </Card>
      )}
    </Page>
  );
}
