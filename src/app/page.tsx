"use client";

import { useState } from "react";
import { Btn, Card, Cell, Empty, Lead, LotMap, Page, StallPoster, Stats } from "@/components/mp";
import { useStore } from "@/lib/store";
import {
  BOOTH_STATE_LABEL,
  boothState,
  canTakeMiniOrder,
  dishPhoto,
  ratingLabel,
  stallCover,
  stallPayLabel,
  tonightBooths,
} from "@/lib/types";

export default function Home() {
  const { venues, stalls, dishes, reviews, isSignupOpen } = useStore();
  const [copied, setCopied] = useState(false);
  const venue = venues[0];
  if (!venue) return <p>还没有经营点。</p>;

  const booths = tonightBooths(stalls.filter((s) => s.venueId === venue.id), venue.floor);
  // Signing up is not the same as standing behind the counter, so the list is
  // grouped by what is actually true right now rather than by who booked.
  const open = booths.filter(({ stall }) => boothState(stall) === "open");
  const waiting = booths.filter(({ stall }) => boothState(stall) === "waiting");
  const packed = booths.filter(({ stall }) => boothState(stall) === "packed");
  const orderable = open.filter(({ stall }) => canTakeMiniOrder(stall));
  const walkup = open.filter(({ stall }) => !canTakeMiniOrder(stall));

  function posters(rows: typeof booths) {
    return rows.map(({ stall, slotNo }) => {
      const menu = dishes.filter((d) => d.stallId === stall.id && d.onTonight);
      return (
        <StallPoster
          key={stall.id}
          href={`/stall/${stall.id}`}
          cover={stallCover(stall)}
          slotNo={slotNo}
          name={stall.vendorName}
          category={stall.category}
          blurb={stall.blurb}
          pay={stallPayLabel(stall)}
          state={BOOTH_STATE_LABEL[boothState(stall)]}
          stateKind={boothState(stall)}
          rating={ratingLabel(reviews, stall.id)}
          dishes={menu.map((d) => ({
            id: d.id,
            name: d.name,
            priceYuan: d.priceYuan,
            photo: dishPhoto(d),
          }))}
        />
      );
    });
  }

  return (
    <Page>
      <Lead kicker={isSignupOpen(venue.id) ? `今日 ${venue.signupBy} 前报名` : "今日报名已截止"} title={venue.name}>
        {venue.open}–{venue.close} · {venue.address}。摊主到场了才算开摊。
      </Lead>
      <Stats
        items={[
          { label: "已开摊", value: venue.closedToday ? "停市" : open.length },
          { label: "还没开摊", value: venue.closedToday ? "—" : waiting.length },
          { label: "可点单", value: venue.closedToday ? "—" : orderable.length },
        ]}
      />
      {!venue.closedToday && (
        <Card>
          <p className="px-3.5 pt-3 text-[13px] text-[var(--muted)]">今晚摊位 · 对着场图找</p>
          <LotMap
            floor={venue.floor}
            hrefFor={(id) => `/stall/${id}`}
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
      {!venue.closedToday && booths.length > 0 && (
        <Card>
          <Cell
            end={
              <Btn
                kind="ink"
                onClick={async () => {
                  const names = open
                    .map(({ stall, slotNo }) => `${slotNo}号 ${stall.vendorName} ${stallPayLabel(stall)}`)
                    .join(" · ");
                  const text = `今晚${venue.name} ${venue.open}–${venue.close} · ${names} · 到摊取不配送`;
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "已复制" : "分享今晚"}
              </Btn>
            }
          >
            <p>发给附近的人</p>
            <p className="text-[13px] text-[var(--muted)]">只带已经开摊的</p>
          </Cell>
        </Card>
      )}
      {venue.closedToday ? (
        <Card>
          <Empty>今日停市。</Empty>
        </Card>
      ) : booths.length === 0 ? (
        <Card>
          <Empty>还没有人报上今日摊位。</Empty>
        </Card>
      ) : (
        <>
          {orderable.length > 0 && (
            <>
              <p className="section-kicker">已开摊 · 可点单 · 到摊取</p>
              {posters(orderable)}
            </>
          )}
          {walkup.length > 0 && (
            <>
              <p className="section-kicker">已开摊 · 到摊看 · 到摊付</p>
              {posters(walkup)}
            </>
          )}
          {open.length === 0 && (
            <Card>
              <Empty>今晚报了名的摊还没开。到场了才会出现在上面。</Empty>
            </Card>
          )}
          {waiting.length > 0 && (
            <div className="is-dim">
              <p className="section-kicker">还没开摊 · 报了名，人还没到</p>
              {posters(waiting)}
            </div>
          )}
          {packed.length > 0 && (
            <div className="is-dim">
              <p className="section-kicker">已收摊 · 今晚别白跑</p>
              {posters(packed)}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
