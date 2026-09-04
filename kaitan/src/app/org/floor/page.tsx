"use client";

import { FormEvent, useState } from "react";
import { Btn, Card, CardHead, Cell, Empty, Lead, Page } from "@/components/mp";
import { useOrgDesk } from "@/lib/use-org";
import { stallCover } from "@/lib/types";

export default function OrgFloorPage() {
  const { allotted, waitlist, noShows, disputes, orders, markArrived, markNoShow, addDispute } = useOrgDesk();
  const [stallId, setStallId] = useState("");
  const [note, setNote] = useState("");
  const pickable = [...allotted, ...noShows];
  const selected = stallId || pickable[0]?.id || "";

  function onDispute(e: FormEvent) {
    e.preventDefault();
    if (!selected || !note.trim()) return;
    addDispute(selected, note);
    setNote("");
  }

  return (
    <Page>
      <Lead kicker="管场" title="现场">
        占到位的要到场。未到就把位放给候补。纠纷只记在场子，不改证、不改货款账户。
      </Lead>
      <Card>
        <CardHead>今晚占到位</CardHead>
        {allotted.length === 0 ? (
          <Empty>还没有人占到今日摊位。</Empty>
        ) : (
          allotted.map((s) => {
            const live = (orders ?? []).some(
              (row) => row.stallId === s.id && (row.status === "placed" || row.status === "ready"),
            );
            return (
              <Cell
                key={s.id}
                thumb={stallCover(s)}
                end={
                  s.arrivedToday ? (
                    <span className="text-[13px] text-[var(--muted)]">已到</span>
                  ) : (
                    <span className="flex gap-1">
                      <Btn kind="ink" onClick={() => markArrived(s.id)}>
                        已到
                      </Btn>
                      <Btn kind="danger" disabled={live} onClick={() => markNoShow(s.id)}>
                        未到放位
                      </Btn>
                    </span>
                  )
                }
              >
                <p>
                  {s.vendorName} · {s.category}
                </p>
                <p className="text-[13px] text-[var(--muted)]">
                  {live ? "还有未取完的单，先退再放位。" : s.arrivedToday ? "人在场。" : "还没点到场。"}
                </p>
              </Cell>
            );
          })
        )}
      </Card>
      {waitlist.length > 0 && (
        <Card>
          <CardHead>候补 · 放位会补进来</CardHead>
          {waitlist.map((s) => (
            <Cell key={s.id} thumb={stallCover(s)}>
              <p>{s.vendorName}</p>
              <p className="text-[13px] text-[var(--muted)]">位满，等人放出来</p>
            </Cell>
          ))}
        </Card>
      )}
      {noShows.length > 0 && (
        <Card>
          <CardHead>今晚未到放位</CardHead>
          {noShows.map((s) => (
            <Cell key={s.id} thumb={stallCover(s)}>
              <p>{s.vendorName}</p>
              <p className="text-[13px] text-[var(--muted)]">位已放出，C 端不再展示</p>
            </Cell>
          ))}
        </Card>
      )}
      <Card>
        <CardHead>记一笔纠纷</CardHead>
        {pickable.length === 0 ? (
          <Empty>今晚还没有摊可记。</Empty>
        ) : (
          <form onSubmit={onDispute} className="space-y-3 px-3.5 py-3">
            <label className="block text-[13px]">
              摊
              <select className="mp-field mt-1" value={selected} onChange={(e) => setStallId(e.target.value)}>
                {pickable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.vendorName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px]">
              发生了什么
              <input
                className="mp-field mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：占位后未出摊、和邻摊起争执"
              />
            </label>
            <Btn kind="lacquer" type="submit">
              记下
            </Btn>
          </form>
        )}
      </Card>
      <Card>
        <CardHead>本场记录</CardHead>
        {(disputes ?? []).length === 0 ? (
          <Empty>还没有纠纷记录。</Empty>
        ) : (
          (disputes ?? []).map((row) => (
            <Cell key={row.id}>
              <p>{row.vendorName}</p>
              <p className="text-[13px] text-[var(--muted)]">{row.note}</p>
            </Cell>
          ))
        )}
      </Card>
    </Page>
  );
}
