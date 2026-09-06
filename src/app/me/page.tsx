"use client";

import Link from "next/link";
import { Empty, Page } from "@/components/mp";
import { useStore } from "@/lib/store";
import { boothState, stallCover, tonightBooths } from "@/lib/types";

/**
 * 我。上面是这个人自己的账，中间是常去的摊——每摊一个「亮灯就提醒我」的开关，
 * 下面三行是平时不用改、要改的时候得找得到的设置。
 */
export default function ConsumerMePage() {
  const { venues, stalls, orders, consumerName, follows, toggleFollow } = useStore();
  const venue = venues[0];
  const picked = orders.filter((row) => row.status === "picked");
  const spent = picked.reduce((sum, row) => sum + row.totalYuan, 0);
  const booths = tonightBooths(stalls, venue?.floor);
  const known = Array.from(new Set([...follows, ...picked.map((row) => row.stallId)]));
  const often = known
    .map((id) => stalls.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <Page>
      <header className="me-head">
        <span className="me-face">{consumerName.slice(0, 1)}</span>
        <div>
          <h2>{consumerName}</h2>
          <small>{venue ? `常去 ${venue.name}` : "还没选经营点"}</small>
        </div>
      </header>
      <div className="me-stats">
        <div>
          <p>{picked.length}</p>
          <small>吃过的单</small>
        </div>
        <div>
          <p>{often.length}</p>
          <small>常去的摊</small>
        </div>
        <div>
          <p>{spent} 元</p>
          <small>累计</small>
        </div>
      </div>
      <h3 className="me-band">常去的摊 · 亮灯就提醒我</h3>
      {often.length === 0 ? (
        <Empty>还没常去的摊。吃过一回就会记在这。</Empty>
      ) : (
        often.map((stall) => {
          const booth = booths.find((row) => row.stall.id === stall.id);
          const on = follows.includes(stall.id);
          const lit = boothState(stall) === "open" && stall.allottedToday;
          return (
            <div key={stall.id} className="me-follow">
              <Link href={`/stall/${stall.id}`}>
                <img src={stallCover(stall)} alt="" />
                <div>
                  <p>{stall.vendorName}</p>
                  <small className={lit ? "is-on" : undefined}>
                    {lit ? `今晚已亮灯 · ${booth?.slotNo ?? "—"}` : stall.allottedToday ? "备摊中 · 未到场" : "今晚没出"}
                  </small>
                </div>
              </Link>
              <button
                type="button"
                className={`me-switch${on ? " is-on" : ""}`}
                aria-label={`${stall.vendorName} 亮灯提醒`}
                aria-pressed={on}
                onClick={() => toggleFollow(stall.id)}
              >
                <i />
              </button>
            </div>
          );
        })
      )}
      <div className="me-set">
        <Link href="/floor">
          <span>常去的经营点</span>
          <em>{venue?.name ?? "没选"}</em>
          <b>›</b>
        </Link>
        <div>
          <span>支付方式</span>
          <em>到摊付</em>
        </div>
        <div>
          <span>反馈与投诉</span>
          <em>到场找管场的人</em>
        </div>
      </div>
    </Page>
  );
}
