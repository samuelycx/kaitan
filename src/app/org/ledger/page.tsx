"use client";

import { Btn, Card, CardHead, Cell, Empty, Lead, Page, Stats } from "@/components/mp";
import { attendance, occupancy, occupancyAverage } from "@/lib/ledger";
import { useOrgDesk } from "@/lib/use-org";
import { cstDate, monthOf, shortDate, stallCover } from "@/lib/types";

/**
 * The three questions the organizer actually has to answer, on one screen:
 * who turns up, who has paid, and how full the venue has been.
 */
export default function OrgLedgerPage() {
  const { venue, active, dayLog, tradingDate, markFeePaid } = useOrgDesk();
  if (!venue) return <p>还没有经营点。</p>;

  const month = monthOf(tradingDate);
  const rows = attendance(dayLog, venue.id, month, active);
  const days = occupancy(dayLog, venue.id);
  const avg = occupancyAverage(days);
  const paid = active.filter((s) => s.feePaidThisMonth);
  const unpaid = active.filter((s) => !s.feePaidThisMonth);
  const filedDays = new Set(dayLog.filter((row) => row.venueId === venue.id).map((row) => row.date));

  return (
    <Page>
      <Lead kicker="管场" title={`${month.replace("-", " 年 ")} 月对账`}>
        照着留档算的。今日 {shortDate(tradingDate)} 还没结束，不算在里面。已留档 {filedDays.size} 天。
      </Lead>
      <Stats
        items={[
          { label: "近七日平均占位", value: avg.taken },
          { label: "平均空位", value: avg.vacant },
          { label: "月费未缴", value: unpaid.length },
        ]}
      />
      <Card>
        <CardHead>出勤与放鸽子 · 本月 · 放鸽子多的排前面</CardHead>
        {rows.length === 0 ? (
          <Empty>本月还没有留档。开启下一日之后才会有。</Empty>
        ) : (
          rows.map((row) => {
            const stall = active.find((s) => s.id === row.stallId);
            return (
              <Cell
                key={row.stallId}
                thumb={stall ? stallCover(stall) : undefined}
                end={row.noShows > 0 ? `放鸽子 ${row.noShows} 次` : "没放过鸽子"}
              >
                <p>
                  {row.vendorName} · 出摊 {row.days} 天
                </p>
                <p className="text-[13px] text-[var(--muted)]">
                  {row.waitlisted > 0 ? `${row.waitlisted} 天报了没抢到，不算他的 · ` : ""}
                  本月流水 {row.salesYuan} 元
                </p>
              </Cell>
            );
          })
        )}
      </Card>
      <Card>
        <CardHead>
          本月月费 · 已缴 {paid.length}/{active.length} · 线下收
        </CardHead>
        {active.map((s) => (
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
              {venue.feeYuanPerMonth} 元 ·{" "}
              {s.feePaidThisMonth ? (s.feePaidAt ? `${shortDate(cstDate(s.feePaidAt))} 交的` : "交了，没记日子") : "还没交"}
            </p>
          </Cell>
        ))}
      </Card>
      <Card>
        <CardHead>最近几天占了几个位 · 共 {venue.floor?.plots.length ?? venue.slots} 个</CardHead>
        {days.length === 0 ? (
          <Empty>还没有留档的日子。</Empty>
        ) : (
          days.map((row) => (
            <Cell key={row.date} end={`空 ${row.vacant}`}>
              <p>
                {shortDate(row.date)} · 占 {row.taken} 个
              </p>
              <p className="text-[13px] text-[var(--muted)]">
                实际开摊 {row.arrived} 个{row.taken > row.arrived ? ` · ${row.taken - row.arrived} 个占了没来` : ""}
              </p>
            </Cell>
          ))
        )}
      </Card>
    </Page>
  );
}
