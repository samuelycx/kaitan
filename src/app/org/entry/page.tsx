"use client";

import { useState } from "react";
import { Btn, Card, CardHead, Cell, Empty, Lead, Page } from "@/components/mp";
import { useOrgDesk } from "@/lib/use-org";
import { cstDate, shortDate, stallCover } from "@/lib/types";

/**
 * The queue that fills up the evening the organizer sends the registration
 * link round. Reviewing one at a time is how it ends up not getting done, so
 * the whole batch can go through in one press.
 */
export default function OrgEntryPage() {
  const { venue, pending, active, reviewMany } = useOrgDesk();
  const [chosen, setChosen] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const queue = [...pending].sort((a, b) => a.appliedAt - b.appliedAt);
  const picked = chosen.filter((id) => queue.some((s) => s.id === id));
  const allPicked = picked.length === queue.length && queue.length > 0;

  function toggle(id: string) {
    setChosen((cur) => (cur.includes(id) ? cur.filter((row) => row !== id) : [...cur, id]));
  }

  function decide(status: "active" | "rejected") {
    if (picked.length === 0) return;
    reviewMany(picked, status);
    setChosen([]);
  }

  return (
    <Page>
      <Lead title="待审进场">
        摊主自己登记，你只管准不准。试运行开始前几天就把链接发到群里，别让人挤在第一天。
      </Lead>
      <Card>
        <Cell
          end={
            <Btn
              kind="ink"
              onClick={async () => {
                const link = `${window.location.origin}/vendor`;
                try {
                  await navigator.clipboard.writeText(
                    `${venue?.name ?? "经营点"}进场登记：${link} 自己填摊名和手机号，我这边审。审过了才能每天报名占位。`,
                  );
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "已复制" : "复制链接"}
            </Btn>
          }
        >
          <p>发登记链接到群里</p>
          <p className="text-[13px] text-[var(--muted)]">
            已在册 {active.length} 家 · 待审 {queue.length} 家
          </p>
        </Cell>
      </Card>
      <Card>
        <CardHead>
          待审 {queue.length} 家 · 选中 {picked.length} 家
        </CardHead>
        {queue.length === 0 ? (
          <Empty>没有待审的摊。链接发出去之后会陆续进来。</Empty>
        ) : (
          <>
            <Cell
              end={
                <Btn kind="ghost" onClick={() => setChosen(allPicked ? [] : queue.map((s) => s.id))}>
                  {allPicked ? "全不选" : "全选"}
                </Btn>
              }
            >
              <p>一次审一批</p>
              <p className="text-[13px] text-[var(--muted)]">勾上要准的，下面一次准了。</p>
            </Cell>
            {queue.map((s) => (
              <Cell
                key={s.id}
                thumb={stallCover(s)}
                end={
                  <Btn kind={picked.includes(s.id) ? "ink" : "ghost"} onClick={() => toggle(s.id)}>
                    {picked.includes(s.id) ? "已选" : "选中"}
                  </Btn>
                }
              >
                <p>
                  {s.vendorName} · {s.category}
                </p>
                <p className="text-[13px] text-[var(--muted)]">
                  {s.phone || "没留电话"}
                  {s.fromStreet ? ` · ${s.fromStreet}` : ""}
                  {s.appliedAt ? ` · ${shortDate(cstDate(s.appliedAt))} 登记` : ""}
                </p>
              </Cell>
            ))}
            <div className="flex gap-2 px-3.5 py-3">
              <Btn kind="lacquer" disabled={picked.length === 0} onClick={() => decide("active")}>
                准了这 {picked.length} 家
              </Btn>
              <Btn kind="danger" disabled={picked.length === 0} onClick={() => decide("rejected")}>
                驳回选中
              </Btn>
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}
