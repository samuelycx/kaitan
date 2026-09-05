"use client";

import { Btn, Card, Cell, Lead, Page, PaperHero } from "@/components/mp";
import { useVendorDesk } from "@/lib/use-vendor";
import { ratingLabel, stallCover, venueCover } from "@/lib/types";

const LABELS = { pending: "待审进场", active: "已入驻", rejected: "未通过" } as const;

export default function VendorMePage() {
  const { vendorName, venue, venues, mine, tenancy, requestOrdering, reviews } = useVendorDesk();

  return (
    <Page>
      {tenancy ? (
        <PaperHero
          src={stallCover(tenancy)}
          kicker="摊主"
          title={vendorName}
          note={tenancy.blurb || tenancy.fromStreet}
        />
      ) : venue ? (
        <PaperHero src={venueCover(venue)} kicker="摊主" title={vendorName} note={venue.name} />
      ) : null}
      <Lead title="点单资格">证照办齐后在这里申请开通。口头愿意、证没下来，不能收款。</Lead>
      {tenancy?.status === "active" && (
        <Card>
          <Cell end={ratingLabel(reviews, tenancy.id)}>
            <p>顾客点评</p>
            <p className="text-[13px] text-[var(--muted)]">吃过的人写在摊上。不是社区。</p>
          </Cell>
          <Cell
            thumb={stallCover(tenancy)}
            end={
              <span className="stamp !rotate-0">
                {tenancy.licenseTier === "ordering" ? (tenancy.orderingPaused ? "已暂停" : "可点单") : "仅展示"}
              </span>
            }
          >
            <p>点单资格</p>
            <p className="text-[13px] text-[var(--muted)]">
              {tenancy.licenseTier === "ordering"
                ? tenancy.orderingPaused
                  ? "证还在。管场暂停了新的线上单，已接的单还要出完。"
                  : "管场已核过执照、食品经营许可和商户号。"
                : tenancy.orderingRequested
                  ? "已提交。管场核过才能收款。"
                  : "没下来之前，顾客只能到摊点、到摊付。"}
            </p>
          </Cell>
          {tenancy.licenseTier !== "ordering" &&
            (tenancy.orderingRequested ? (
              <Cell>
                <p className="text-[13px]">核证中</p>
              </Cell>
            ) : (
              <Cell
                end={
                  <Btn kind="ghost" onClick={() => requestOrdering(tenancy.id)}>
                    申请开通
                  </Btn>
                }
              >
                <p className="text-[13px] text-[var(--muted)]">证照已办齐再点</p>
              </Cell>
            ))}
          {venue && (
            <Cell>
              <p>本月管理费</p>
              <p className="text-[13px] text-[var(--muted)]">
                {venue.feeYuanPerMonth} 元 · {tenancy.feePaidThisMonth ? "已缴" : "未缴，线下交给管场"}
              </p>
            </Cell>
          )}
        </Card>
      )}
      {mine.length > 0 && (
        <Card>
          {mine.map((s) => (
            <Cell key={s.id} thumb={stallCover(s)}>
              <p>{venues.find((v) => v.id === s.venueId)?.name}</p>
              <p className="text-[13px] text-[var(--muted)]">
                {LABELS[s.status]} · {s.category} · {s.fromStreet}
              </p>
            </Cell>
          ))}
        </Card>
      )}
    </Page>
  );
}
