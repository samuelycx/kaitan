"use client";

import { FormEvent, useState } from "react";
import { Btn, Card, CardHead, Cell, Empty, Lead, LotMap, Page, PaperHero } from "@/components/mp";
import { plotUseLabel } from "@/lib/lot";
import { useVendorDesk } from "@/lib/use-vendor";
import { boothState, isPhone, stallCover, tonightBooths, venueCover } from "@/lib/types";

export default function VendorSlotPage() {
  const {
    venue,
    vendorName,
    tenancy,
    stalls,
    signupOpen,
    register,
    signUp,
    withdraw,
    markArrived,
    markPackedUp,
    setPlotPreference,
    claimFreedPlot,
  } = useVendorDesk();
  const [category, setCategory] = useState("小吃");
  const [fromStreet, setFromStreet] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // The map only opens when the vendor wants a different plot from last time.
  const [picking, setPicking] = useState(false);

  const canRegister = Boolean(name.trim()) && isPhone(phone) && Boolean(category.trim());

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!venue || !canRegister) return;
    register({ venueId: venue.id, vendorName: name, phone, category, fromStreet });
    setName("");
    setPhone("");
    setFromStreet("");
  }

  if (!venue) return <p>还没有经营点。</p>;

  if (!tenancy) {
    return (
      <Page>
        <PaperHero
          src={venueCover(venue)}
          kicker="摊主"
          title={venue.name}
          note="自己填，管场审。审过了才能每天报名占位。"
        />
        <Lead title="登记进场">
          {venue.address} · 每天 {venue.open}–{venue.close} · 月管理费 {venue.feeYuanPerMonth} 元，线下交
        </Lead>
        <Card>
          <form onSubmit={onSubmit} className="space-y-3 px-3.5 py-3">
            <label className="block text-[13px]">
              摊名
              <input
                className="mp-field mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="顾客看到的就是这个，例如：王姐烤面筋"
              />
            </label>
            <label className="block text-[13px]">
              手机号
              <input
                className="mp-field mt-1"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="管场联系你用，不给顾客看"
              />
              {phone && !isPhone(phone) && <span className="mt-1 block text-[var(--muted)]">手机号填满 11 位。</span>}
            </label>
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
            <Btn kind="lacquer" type="submit" disabled={!canRegister}>
              交上去等审
            </Btn>
            <p className="text-[13px] text-[var(--muted)]">
              一个手机号只能登记一次。审过之前不用天天来看，结果会在这一页。
            </p>
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
  const state = boothState(tenancy);
  const repeatPlot = venue.floor?.plots.find((p) => p.id === (tenancy.lotPlotId || tenancy.lastPlotId));
  // After the cutoff a plot only comes free when someone is marked a no-show,
  // and it stays empty until a waitlisted vendor actually asks for it.
  const freePlots = (venue.floor?.plots ?? []).filter(
    (p) => !booths.some((row) => (row.plot?.id || row.stall.lotPlotId) === p.id),
  );
  const status = tenancy.allottedToday
    ? `今日摊位已占到${mine ? ` · ${mine.slotNo} 号` : ""}`
    : tenancy.signedUpToday
      ? "已报名，位满候补"
      : signupOpen
        ? "报名未截止，不报没有位"
        : "今日未报名，没有摊位";
  const showMap = picking || !repeatPlot || !signupOpen || tenancy.signedUpToday;

  return (
    <Page>
      <PaperHero
        src={tenancy.allottedToday ? stallCover(tenancy) : venueCover(venue)}
        kicker={vendorName}
        title={venue.name}
        note={`${status} · 每天 ${venue.signupBy} 前报名`}
      />
      {!tenancy.signedUpToday && signupOpen && repeatPlot && !picking && (
        <Card>
          <Cell
            end={
              <Btn kind="ghost" onClick={() => setPicking(true)}>
                换个位
              </Btn>
            }
          >
            <p className="font-display text-lg">报今天，还是 {repeatPlot.no} 号</p>
            <p className="text-[13px] text-[var(--muted)]">上次就是这个位。一下报完，要换再点换个位。</p>
          </Cell>
          <div className="px-3.5 pb-3">
            <Btn kind="lacquer" onClick={() => signUp(tenancy.id)}>
              报今天
            </Btn>
          </div>
        </Card>
      )}
      {showMap && (
      <Card>
        <p className="px-3.5 pt-3 text-[13px] text-[var(--muted)]">
          {signupOpen ? "点空位抢位 · 先点先得 · 红框是你" : "今晚场上 · 红框是你"}
        </p>
        <LotMap
          floor={venue.floor}
          highlightId={tenancy.id}
          pickCategory={signupOpen ? tenancy.category : undefined}
          pickFor={
            signupOpen
              ? (plotId) => {
                  signUp(tenancy.id, plotId);
                  setPicking(false);
                }
              : undefined
          }
          booths={booths.map(({ stall, slotNo, plot }) => ({
            slotNo,
            cover: stallCover(stall),
            name: stall.vendorName,
            stallId: stall.id,
            plotId: plot?.id || stall.lotPlotId,
          }))}
        />
      </Card>
      )}
      <Card>
        <Cell>
          <p className="font-display text-lg">{tenancy.allottedToday ? `${mine?.slotNo ?? ""} 号摊` : "还没占到"}</p>
          <p className="text-[13px] text-[var(--muted)]">
            月管理费 {venue.feeYuanPerMonth} 元 · {tenancy.feePaidThisMonth ? "已缴" : "未缴"}
          </p>
        </Cell>
        {signupOpen && (
          <Cell
            end={
              <Btn
                kind="ghost"
                onClick={() =>
                  setPlotPreference(tenancy.id, tenancy.plotPreference === "any" ? "only" : "any")
                }
              >
                改
              </Btn>
            }
          >
            <p>{tenancy.plotPreference === "any" ? "有位就行" : "只要这个位"}</p>
            <p className="text-[13px] text-[var(--muted)]">
              {tenancy.plotPreference === "any"
                ? "这个位被人抢先了，就自动换到别的能摆的空位。"
                : "这个位被人抢先了，就排候补等它，不换位。"}
            </p>
          </Cell>
        )}
        <Cell
          end={
            signupOpen ? (
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
              state === "open" ? (
                <Btn kind="ghost" onClick={() => markPackedUp(tenancy.id)}>
                  我收摊了
                </Btn>
              ) : state === "packed" ? (
                <span className="text-[13px] text-[var(--muted)]">今晚已收</span>
              ) : (
                <Btn kind="lacquer" onClick={() => markArrived(tenancy.id)}>
                  我开摊了
                </Btn>
              )
            }
          >
            <p>
              {state === "open" ? "已开摊，顾客能看到你" : state === "packed" ? "已收摊" : "到了点一下开摊"}
            </p>
            <p className="text-[13px] text-[var(--muted)]">
              {state === "open"
                ? `收摊后顾客端就不再显示你。到 ${venue.close} 会自动算收摊。`
                : state === "packed"
                  ? "顾客端已经把你收起来了。"
                  : "不点开摊，顾客端只显示还没开摊，也点不了单。"}
            </p>
          </Cell>
        )}
      </Card>
      {!signupOpen && tenancy.signedUpToday && !tenancy.allottedToday && freePlots.length > 0 && (
        <Card>
          <CardHead>截止后放出来的空位 · 要就自己认，不自动派</CardHead>
          {freePlots.map((plot) => (
            <Cell
              key={plot.id}
              end={
                <Btn kind="lacquer" onClick={() => claimFreedPlot(tenancy.id, plot.id)}>
                  我要这个
                </Btn>
              }
            >
              <p>{plot.no} 号空出来了</p>
              <p className="text-[13px] text-[var(--muted)]">{plotUseLabel(plot.use)}</p>
            </Cell>
          ))}
        </Card>
      )}
      {!tenancy.signedUpToday && signupOpen && showMap && (
        <Card>
          <Empty>点图上和你业态对得上的空位。先点先得。宽位是水果，深位是炭火。</Empty>
        </Card>
      )}
    </Page>
  );
}
