"use client";

import { Card, CardHead, Cell, Empty, Lead, Page, PaperHero } from "@/components/mp";
import { useStore } from "@/lib/store";
import { ORDER_STATUS, orderThumb, stallCover, venueCover } from "@/lib/types";

export default function ConsumerMePage() {
  const { venues, stalls, dishes, orders, reviews } = useStore();
  const venue = venues[0];
  if (!venue) return <p>还没有经营点。</p>;
  const tickets = (orders ?? []).filter((row) => row.status !== "refunded");
  const mine = (reviews ?? []).filter((row) => row.nick === "路过的人" && row.at > 10);

  return (
    <Page>
      <PaperHero
        src={venueCover(venue)}
        kicker={venue.closedToday ? "今日停市" : "每天开门"}
        title={venue.name}
        note={`${venue.open}–${venue.close} · ${venue.address}`}
      />
      <Lead kicker="开摊" title="到摊取">
        票上有摊位号。对着场上格子找，把号给摊上看。不配送。
      </Lead>
      <Card>
        <CardHead>我的取餐</CardHead>
        {tickets.length === 0 ? (
          <Empty>还没有线上单。证齐的摊可以点，到摊取。</Empty>
        ) : (
          tickets.map((row) => {
            const stall = stalls.find((s) => s.id === row.stallId);
            return (
              <Cell
                key={row.id}
                href={`/orders/${row.id}`}
                thumb={orderThumb(row, dishes) || (stall ? stallCover(stall) : undefined)}
                end={ORDER_STATUS[row.status]}
              >
                <p className="font-display text-lg leading-none">取餐 {row.pickupNo}</p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  {row.slotNo && row.slotNo !== "—" ? `${row.slotNo}号摊 · ` : ""}
                  {row.vendorName} · {row.totalYuan} 元
                </p>
              </Cell>
            );
          })
        )}
      </Card>
      <Card>
        <CardHead>怎么到场</CardHead>
        <Cell href="/">
          <p>{venue.address}</p>
          <p className="text-[13px] text-[var(--muted)]">
            {venue.open}–{venue.close} · 摊位号对着场上格子，从场口往里数
          </p>
        </Cell>
        <Cell>
          <p>今日报名</p>
          <p className="text-[13px] text-[var(--muted)]">{venue.signupBy} 前 · 不报当天没有摊</p>
        </Cell>
        <Cell>
          <p>点单</p>
          <p className="text-[13px] text-[var(--muted)]">只有证齐的摊能在小程序付。别的到摊付。</p>
        </Cell>
      </Card>
      {mine.length > 0 && (
        <Card>
          <CardHead>我写过的评</CardHead>
          {mine.map((row) => {
            const stall = stalls.find((s) => s.id === row.stallId);
            return (
              <Cell key={row.id} href={stall ? `/stall/${stall.id}` : undefined} end={`${row.stars} 星`}>
                <p>{stall?.vendorName ?? "摊"}</p>
                <p className="text-[13px] text-[var(--muted)]">{row.note}</p>
              </Cell>
            );
          })}
        </Card>
      )}
    </Page>
  );
}
