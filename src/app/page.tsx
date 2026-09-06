"use client";

import { useState } from "react";
import { Band, Btn, Card, Cell, Empty, FloorEntry, Page, StallRow } from "@/components/mp";
import { useStore } from "@/lib/store";
import { stallQueue } from "@/lib/queue";
import { boothState, canTakeMiniOrder, stallCover, stallPayLabel, stallRating, tonightBooths } from "@/lib/types";

/**
 * 今晚名单。分三段：已亮灯的能吃，备摊的报了名还没到，今晚不出的别白跑。
 * 排序就是这个顺序，所以顾客不用读状态字，从上往下看就行。
 */
export default function Home() {
  const { venues, stalls, dishes, orders, reviews, isSignupOpen } = useStore();
  const [copied, setCopied] = useState(false);
  const venue = venues[0];
  if (!venue) return <p>还没有经营点。</p>;

  const booths = tonightBooths(stalls.filter((s) => s.venueId === venue.id), venue.floor);
  const open = booths.filter(({ stall }) => boothState(stall) === "open");
  const waiting = booths.filter(({ stall }) => boothState(stall) === "waiting");
  const packed = booths.filter(({ stall }) => boothState(stall) === "packed");

  function rows(list: typeof booths) {
    return list.map(({ stall, slotNo }) => {
      const menu = dishes.filter((d) => d.stallId === stall.id && d.onTonight);
      const cheapest = menu.length > 0 ? Math.min(...menu.map((d) => d.priceYuan)) : undefined;
      const { ahead, minutes } = stallQueue(orders, stall.id);
      const state = boothState(stall);
      const rating = stallRating(reviews, stall.id);
      return (
        <StallRow
          key={stall.id}
          href={`/stall/${stall.id}`}
          cover={stallCover(stall)}
          name={stall.vendorName}
          plotNo={slotNo}
          category={[stall.category, stall.blurb].filter(Boolean).join(" · ")}
          fromYuan={cheapest}
          queue={
            canTakeMiniOrder(stall)
              ? ahead > 0
                ? `排 ${ahead} 单 · 约 ${minutes} 分钟`
                : "现在不用排"
              : stallPayLabel(stall)
          }
          rating={rating.count > 0 ? `${rating.avg}` : undefined}
          state={state}
          waitNote={state === "waiting" ? `报了 ${slotNo} 位 · 人还没到` : "今晚已经收摊"}
        />
      );
    });
  }

  return (
    <Page>
      <header className="tonight-head">
        <h2>今晚名单</h2>
        <p className="tonight-tally">
          <i className="tonight-dot" />
          <strong>{venue.closedToday ? "今日停市" : `${open.length} 家已亮灯`}</strong>
          {!venue.closedToday && ` · ${waiting.length} 家备摊 · ${packed.length} 家不出`}
        </p>
        <p className="mt-2 text-[12px] text-[var(--muted)]">
          {venue.name} {venue.open}–{venue.close} ·{" "}
          {isSignupOpen(venue.id) ? `今日 ${venue.signupBy} 前报名` : "今日报名已截止"}
        </p>
        {!venue.closedToday && <FloorEntry href="/floor" note="红格=已亮灯" />}
      </header>
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
          <Band title="已亮灯" note="现在能吃" tone="open" />
          {open.length === 0 ? <Empty>报了名的摊还没开。到场了才会出现在这里。</Empty> : rows(open)}
          {waiting.length > 0 && (
            <>
              <Band title="备摊中" note="报了名还没亮灯" />
              {rows(waiting)}
            </>
          )}
          {packed.length > 0 && (
            <>
              <Band title="今晚不出" note="别白跑" />
              {rows(packed)}
            </>
          )}
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
              <p className="text-[13px] text-[var(--muted)]">只带已经亮灯的</p>
            </Cell>
          </Card>
        </>
      )}
    </Page>
  );
}
