"use client";

import { Btn, Card, CardHead, Cell, Empty, Lead, Page } from "@/components/mp";
import { useOrgDesk } from "@/lib/use-org";
import { stallCover } from "@/lib/types";

export default function OrgLicensePage() {
  const { licenseQueue, canOrder, reviewOrdering } = useOrgDesk();

  return (
    <Page>
      <Lead title="核证开通点单">核的是个体户执照、食品经营许可、微信支付商户号。口头愿意办、证没下来，不要开。</Lead>
      <Card>
        <CardHead>待核证</CardHead>
        {licenseQueue.length === 0 ? (
          <Empty>没有待核的申请。</Empty>
        ) : (
          licenseQueue.map((s) => (
            <Cell
              key={s.id}
              thumb={stallCover(s)}
              end={
                <span className="flex gap-2">
                  <Btn kind="ghost" onClick={() => reviewOrdering(s.id, true)}>
                    证齐
                  </Btn>
                  <Btn kind="danger" onClick={() => reviewOrdering(s.id, false)}>
                    未齐
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
      <Card>
        <CardHead>已开通小程序点单</CardHead>
        {canOrder.length === 0 ? (
          <Empty>还没有摊开通点单。</Empty>
        ) : (
          canOrder.map((s) => (
            <Cell
              key={s.id}
              thumb={stallCover(s)}
              end={
                <Btn kind="danger" onClick={() => reviewOrdering(s.id, false)}>
                  关掉
                </Btn>
              }
            >
              <p>
                {s.vendorName} · {s.category}
              </p>
            </Cell>
          ))
        )}
      </Card>
    </Page>
  );
}
