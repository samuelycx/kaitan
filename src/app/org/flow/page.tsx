"use client";

import { Btn, Card, CardHead, Cell, Empty, Lead, Page, Stats } from "@/components/mp";
import { useOrgDesk } from "@/lib/use-org";
import { ORDER_STATUS, orderThumb, photoByName, stallCover } from "@/lib/types";

export default function OrgFlowPage() {
  const { here, canOrder, tonightSales, tonightOrders, dishes, pauseOrdering, refundOrder } = useOrgDesk();
  const miniYuan = tonightSales.filter((row) => row.channel === "mini").reduce((sum, row) => sum + row.priceYuan, 0);
  const stallYuan = tonightSales.filter((row) => row.channel === "stall").reduce((sum, row) => sum + row.priceYuan, 0);
  const totalYuan = miniYuan + stallYuan;
  const live = tonightOrders.filter((row) => row.status === "placed" || row.status === "ready");

  return (
    <Page>
      <Lead title="今晚流水">只看场子记下来的。货款在各摊商户里，管场不经手。</Lead>
      <Stats
        items={[
          { label: "合计", value: `${totalYuan}元` },
          { label: "小程序", value: `${miniYuan}元` },
          { label: "摊上", value: `${stallYuan}元` },
        ]}
      />
      <Card>
        <CardHead>已开通点单的摊</CardHead>
        {canOrder.length === 0 ? (
          <Empty>还没有摊开通点单。</Empty>
        ) : (
          canOrder.map((s) => {
            const rows = tonightSales.filter((row) => row.stallId === s.id);
            const yuan = rows.reduce((sum, row) => sum + row.priceYuan, 0);
            return (
              <Cell
                key={s.id}
                thumb={stallCover(s)}
                end={
                  <Btn kind={s.orderingPaused ? "ink" : "danger"} onClick={() => pauseOrdering(s.id, !s.orderingPaused)}>
                    {s.orderingPaused ? "恢复接单" : "暂停接单"}
                  </Btn>
                }
              >
                <p>
                  {s.vendorName} · {s.allottedToday ? `${yuan} 元` : "今日无位"}
                </p>
                <p className="text-[13px] text-[var(--muted)]">
                  {s.orderingPaused ? "已暂停新单，证还在。" : "证齐，可接小程序单。"}
                </p>
              </Cell>
            );
          })
        )}
      </Card>
      <Card>
        <CardHead>线上单 {live.length > 0 ? `· ${live.length} 笔未取完` : ""}</CardHead>
        {tonightOrders.length === 0 ? (
          <Empty>今晚还没有小程序单。</Empty>
        ) : (
          tonightOrders.map((row) => (
            <Cell
              key={row.id}
              thumb={orderThumb(row, dishes)}
              end={
                row.status === "placed" || row.status === "ready" ? (
                  <Btn kind="danger" onClick={() => refundOrder(row.id)}>
                    退
                  </Btn>
                ) : (
                  `${row.totalYuan} 元`
                )
              }
            >
              <p>
                取餐 {row.pickupNo} · {row.vendorName}
              </p>
              <p className="text-[13px] text-[var(--muted)]">
                {ORDER_STATUS[row.status]} · {row.totalYuan} 元 · {row.items.map((item) => `${item.name}×${item.qty}`).join(" · ")}
              </p>
            </Cell>
          ))
        )}
      </Card>
      {tonightSales.some((row) => row.channel === "stall") && (
        <Card>
          <CardHead>现场记的单</CardHead>
          {tonightSales
            .filter((row) => row.channel === "stall")
            .slice(0, 12)
            .map((row) => (
              <Cell key={row.id} thumb={photoByName(row.dishName)} end={`${row.priceYuan} 元`}>
                <p>
                  {here.find((s) => s.id === row.stallId)?.vendorName} · {row.dishName}
                </p>
              </Cell>
            ))}
        </Card>
      )}
    </Page>
  );
}
