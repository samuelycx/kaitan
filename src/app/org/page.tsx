"use client";

import { Card, CardHead, Cell, Empty, Lead, LotMap, Page, Stats } from "@/components/mp";
import { useOrgDesk } from "@/lib/use-org";
import { BOOTH_STATE_LABEL, boothState, stallCover, tonightBooths } from "@/lib/types";

export default function OrgTodayPage() {
  const { venue, allotted, openNow, notArrived, packedUp, signupOpen, waitlist, missed, noShows, vacant, dishes } =
    useOrgDesk();
  if (!venue) return <p>还没有经营点。</p>;
  const booths = tonightBooths(allotted, venue.floor);

  return (
    <Page>
      <Lead kicker="管场" title="今日占位">
        {venue.closedToday
          ? "今日停市。顾客端不展示摊。"
          : signupOpen
            ? `报名进行中，${venue.signupBy} 一到自动截止。`
            : "已截止。未报名的今晚没有摊位。"}
      </Lead>
      <Stats
        items={[
          { label: "已开摊", value: venue.closedToday ? "停市" : openNow.length },
          { label: "报了没到", value: venue.closedToday ? "—" : notArrived.length },
          { label: "空位", value: vacant },
        ]}
      />
      {!venue.closedToday && (
        <Card>
          <p className="px-3.5 pt-3 text-[13px] text-[var(--muted)]">今晚摊位 · 对着场图</p>
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
      )}
      <Card>
        <Cell href="/org/floor" end="现场 ›">
          <p>到场 · 未到放位 · 纠纷</p>
          <p className="text-[13px] text-[var(--muted)]">
            {venue.closedToday
              ? "停市"
              : `${openNow.length} 已开摊 · ${notArrived.length} 没到 · ${packedUp.length} 已收 · ${noShows.length} 放位`}
          </p>
        </Cell>
      </Card>
      <Card>
        <CardHead>顾客今晚会看到 · 只有已开摊的能点单</CardHead>
        {venue.closedToday ? (
          <Empty>停市，开摊里是空的。</Empty>
        ) : allotted.length === 0 ? (
          <Empty>还没有人占到今日摊位。</Empty>
        ) : (
          allotted.map((s) => {
            const menu = dishes.filter((d) => d.stallId === s.id && d.onTonight);
            const booth = booths.find((row) => row.stall.id === s.id);
            return (
              <Cell key={s.id} thumb={stallCover(s)} end={BOOTH_STATE_LABEL[boothState(s)]}>
                <p>
                  {booth?.slotNo ? `${booth.slotNo} · ` : ""}
                  {s.vendorName} · {s.category}
                </p>
                <p className="truncate text-[13px] text-[var(--muted)]">
                  {menu.length > 0 ? menu.map((d) => `${d.name} ${d.priceYuan}元`).join(" · ") : "菜单还没写"}
                </p>
              </Cell>
            );
          })
        )}
      </Card>
      {waitlist.length > 0 && (
        <Card>
          <CardHead>已报名候补</CardHead>
          {waitlist.map((s) => (
            <Cell key={s.id} thumb={stallCover(s)}>
              <p>{s.vendorName}</p>
              <p className="text-[13px] text-[var(--muted)]">位满</p>
            </Cell>
          ))}
        </Card>
      )}
      <Card>
        <CardHead>未报名 · 没有摊位</CardHead>
        {missed.length === 0 ? (
          <Empty>在册摊主都报了。</Empty>
        ) : (
          missed.map((s) => (
            <Cell key={s.id} thumb={stallCover(s)}>
              <p>
                {s.vendorName} · {s.category}
              </p>
              <p className="text-[13px] text-[var(--muted)]">{s.fromStreet}</p>
            </Cell>
          ))
        )}
      </Card>
    </Page>
  );
}
