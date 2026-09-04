"use client";

import { FormEvent, useState } from "react";
import { Btn, Card, Cell, Empty, Lead, LotMap, Page, PaperHero } from "@/components/mp";
import { useVendorDesk } from "@/lib/use-vendor";
import { stallCover, tonightBooths, venueCover } from "@/lib/types";

export default function VendorSlotPage() {
  const { venue, vendorName, tenancy, stalls, apply, signUp, withdraw, markArrived } = useVendorDesk();
  const [category, setCategory] = useState("小吃");
  const [fromStreet, setFromStreet] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!venue || !fromStreet.trim()) return;
    apply(venue.id, category, fromStreet.trim());
    setFromStreet("");
  }

  if (!venue) return <p>还没有经营点。</p>;

  if (!tenancy) {
    return (
      <Page>
        <PaperHero src={venueCover(venue)} kicker="摊主" title={venue.name} note="把路边摊收到场内。进场后仍须每天报名占位。" />
        <Lead title="申请进场">{venue.address}</Lead>
        <Card>
          <form onSubmit={onSubmit} className="space-y-3 px-3.5 py-3">
            <label className="block text-[13px]">
              品类
              <input className="mp-field mt-1" value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label className="block text-[13px]">
              原来在哪摆
              <input
                className="mp-field mt-1"
                value={fromStreet}
                onChange={(e) => setFromStreet(e.target.value)}
                placeholder="例如：地铁 A 口、小区东门"
              />
            </label>
            <Btn kind="lacquer" type="submit">
              申请迁入
            </Btn>
          </form>
        </Card>
      </Page>
    );
  }

  if (tenancy.status !== "active") {
    return (
      <Page>
        <PaperHero src={stallCover(tenancy)} kicker={vendorName} title="占位" note={tenancy.fromStreet} />
        <Lead title={tenancy.status === "pending" ? "进场还在审" : "这次没过"}>
          {tenancy.status === "pending" ? "准了才能报今日摊位。" : "改材料后再找管场。"}
        </Lead>
        <Card>
          <Cell thumb={stallCover(tenancy)}>
            <p>{venue.name}</p>
            <p className="text-[13px] text-[var(--muted)]">
              {tenancy.category} · {tenancy.fromStreet}
            </p>
          </Cell>
        </Card>
      </Page>
    );
  }

  const booths = tonightBooths(stalls.filter((s) => s.venueId === venue.id), venue.floor);
  const mine = booths.find((row) => row.stall.id === tenancy.id);
  const status = tenancy.allottedToday
    ? `今日摊位已占到${mine ? ` · ${mine.slotNo} 号` : ""}`
    : tenancy.signedUpToday
      ? "已报名，位满候补"
      : venue.signupOpen
        ? "报名未截止，不报没有位"
        : "今日未报名，没有摊位";

  return (
    <Page>
      <PaperHero
        src={tenancy.allottedToday ? stallCover(tenancy) : venueCover(venue)}
        kicker={vendorName}
        title={venue.name}
        note={`${status} · 每天 ${venue.signupBy} 前报名`}
      />
      <Card>
        <p className="px-3.5 pt-3 text-[13px] text-[var(--muted)]">
          {venue.signupOpen ? "点空位抢位 · 先点先得 · 红框是你" : "今晚场上 · 红框是你"}
        </p>
        <LotMap
          floor={venue.floor}
          highlightId={tenancy.id}
          pickCategory={venue.signupOpen ? tenancy.category : undefined}
          pickFor={venue.signupOpen ? (plotId) => signUp(tenancy.id, plotId) : undefined}
          booths={booths.map(({ stall, slotNo, plot }) => ({
            slotNo,
            cover: stallCover(stall),
            name: stall.vendorName,
            stallId: stall.id,
            plotId: plot?.id || stall.lotPlotId,
          }))}
        />
      </Card>
      <Card>
        <Cell>
          <p className="font-display text-lg">{tenancy.allottedToday ? `${mine?.slotNo ?? ""} 号摊` : "还没占到"}</p>
          <p className="text-[13px] text-[var(--muted)]">
            月管理费 {venue.feeYuanPerMonth} 元 · {tenancy.feePaidThisMonth ? "已缴" : "未缴"}
          </p>
        </Cell>
        <Cell
          end={
            venue.signupOpen ? (
              tenancy.signedUpToday ? (
                <Btn kind="ghost" onClick={() => withdraw(tenancy.id)}>
                  取消报名
                </Btn>
              ) : (
                <span className="text-[13px] text-[var(--muted)]">点空位</span>
              )
            ) : (
              <span className="text-[13px] text-[var(--muted)]">报名已截止</span>
            )
          }
        >
          <p>{tenancy.allottedToday ? "已占到" : tenancy.signedUpToday ? "候补" : "未报名"}</p>
        </Cell>
        {tenancy.allottedToday && (
          <Cell
            end={
              tenancy.arrivedToday ? (
                <span className="text-[13px] text-[var(--muted)]">管场已见</span>
              ) : (
                <Btn kind="ink" onClick={() => markArrived(tenancy.id)}>
                  我已到场
                </Btn>
              )
            }
          >
            <p>{tenancy.arrivedToday ? "已到场" : "到了点一下"}</p>
            <p className="text-[13px] text-[var(--muted)]">不到场，管场会放位给候补。</p>
          </Cell>
        )}
      </Card>
      {!tenancy.signedUpToday && venue.signupOpen && (
        <Card>
          <Empty>点图上和你业态对得上的空位。先点先得。宽位是水果，深位是炭火。</Empty>
        </Card>
      )}
    </Page>
  );
}
