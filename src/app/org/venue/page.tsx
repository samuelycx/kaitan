"use client";

import { Btn, Card, CardHead, Cell, Empty, Lead, LotMap, Page, PaperHero } from "@/components/mp";
import { useOrgDesk } from "@/lib/use-org";
import { stallCover, tonightBooths, venueCover } from "@/lib/types";

export default function OrgVenuePage() {
  const {
    venue,
    organizerName,
    active,
    allotted,
    feeUnpaid,
    signupOpen,
    nowMinutes,
    demoMinutes,
    setDemoMinutes,
    closeSignup,
    openNextDay,
    markFeePaid,
    setClosedToday,
  } = useOrgDesk();
  if (!venue) return <p>还没有经营点。</p>;
  const booths = tonightBooths(allotted, venue.floor);
  const clock = `${String(Math.floor(nowMinutes / 60)).padStart(2, "0")}:${String(nowMinutes % 60).padStart(2, "0")}`;

  return (
    <Page>
      <PaperHero
        src={venueCover(venue)}
        kicker={venue.closedToday ? "今日停市" : "每天开门"}
        title={venue.name}
        note={`${organizerName} · ${venue.address}`}
      />
      <Lead title="场子">{venue.note}</Lead>
      <Card>
        <Cell>
          <p>营业</p>
          <p className="text-[13px] text-[var(--muted)]">
            每天 {venue.open}–{venue.close}
          </p>
        </Cell>
        <Cell>
          <p>报名截止</p>
          <p className="text-[13px] text-[var(--muted)]">
            {venue.signupBy} 一到自动截止 · 现在 {clock}
          </p>
        </Cell>
        <Cell>
          <p>摊位</p>
          <p className="text-[13px] text-[var(--muted)]">
            共 {venue.floor?.plots.length ?? venue.slots} 个 · 面积按业态 · 今晚占到 {allotted.length}
          </p>
        </Cell>
        <Cell>
          <p>月管理费</p>
          <p className="text-[13px] text-[var(--muted)]">{venue.feeYuanPerMonth} 元 · 线下收</p>
        </Cell>
        <Cell
          end={
            <Btn kind={venue.closedToday ? "ink" : "ghost"} onClick={() => setClosedToday(venue.id, !venue.closedToday)}>
              {venue.closedToday ? "恢复开门" : "今日停市"}
            </Btn>
          }
        >
          <p>{venue.closedToday ? "今日停市" : "今日开门"}</p>
          <p className="text-[13px] text-[var(--muted)]">停市后顾客端不展示摊。</p>
        </Cell>
      </Card>
      <Card>
        <Cell
          end={
            signupOpen ? (
              <Btn kind="ink" onClick={() => closeSignup(venue.id)}>
                提前截止
              </Btn>
            ) : (
              <Btn kind="ghost" onClick={() => openNextDay(venue.id)}>
                下一日
              </Btn>
            )
          }
        >
          <p>{signupOpen ? "报名进行中" : "今日已截止"}</p>
          <p className="text-[13px] text-[var(--muted)]">
            {signupOpen
              ? `到 ${venue.signupBy} 自己就截止，不用管。要提前收就点右边。`
              : "未报名的今晚没有摊位。"}
          </p>
        </Cell>
      </Card>
      <Card>
        <CardHead>演示用的时间 · 真实经营点上不出现</CardHead>
        <Cell
          end={
            <span className="flex gap-1">
              <Btn kind="ghost" onClick={() => setDemoMinutes(14 * 60)}>
                截止前
              </Btn>
              <Btn kind="ghost" onClick={() => setDemoMinutes(18 * 60)}>
                开摊时段
              </Btn>
              <Btn kind="ghost" onClick={() => setDemoMinutes(null)}>
                跟真实时间
              </Btn>
            </span>
          }
        >
          <p>现在按 {clock} 算</p>
          <p className="text-[13px] text-[var(--muted)]">
            {demoMinutes === null ? "跟着手机时间走。" : "演示时间。拨过截止点就能看到自动截止。"}
          </p>
        </Cell>
      </Card>
      <Card>
        <p className="px-3.5 pt-3 text-[13px] text-[var(--muted)]">今晚摊位</p>
        <LotMap
          floor={venue.floor}
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
        <CardHead>
          本月管理费 · 已缴 {active.length - feeUnpaid.length}/{active.length} · 线下收，只做记号
        </CardHead>
        {active.length === 0 ? (
          <Empty>还没有在册摊主。</Empty>
        ) : (
          active.map((s) => (
            <Cell
              key={s.id}
              thumb={stallCover(s)}
              end={
                <Btn kind={s.feePaidThisMonth ? "ghost" : "ink"} onClick={() => markFeePaid(s.id, !s.feePaidThisMonth)}>
                  {s.feePaidThisMonth ? "改未缴" : "记已缴"}
                </Btn>
              }
            >
              <p>
                {s.vendorName} · {s.feePaidThisMonth ? "已缴" : "未缴"}
              </p>
              <p className="text-[13px] text-[var(--muted)]">
                {venue.feeYuanPerMonth} 元 · {s.category}
              </p>
            </Cell>
          ))
        )}
      </Card>
    </Page>
  );
}
