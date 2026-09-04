"use client";

import { Btn, Card, Cell, Empty, Lead, Page } from "@/components/mp";
import { useOrgDesk } from "@/lib/use-org";
import { stallCover } from "@/lib/types";

export default function OrgEntryPage() {
  const { pending, review } = useOrgDesk();

  return (
    <Page>
      <Lead title="待审进场">路边摊迁入。准了才能每天报名占位。</Lead>
      <Card>
        {pending.length === 0 ? (
          <Empty>没有待审的摊。</Empty>
        ) : (
          pending.map((s) => (
            <Cell
              key={s.id}
              thumb={stallCover(s)}
              end={
                <span className="flex gap-2">
                  <Btn kind="ghost" onClick={() => review(s.id, "active")}>
                    准许
                  </Btn>
                  <Btn kind="danger" onClick={() => review(s.id, "rejected")}>
                    驳回
                  </Btn>
                </span>
              }
            >
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
