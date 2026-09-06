"use client";

import { Card, Cell, Empty, Lead, Page } from "@/components/mp";
import { useStore } from "@/lib/store";
import { ORDER_STATUS, orderThumb, stallCover } from "@/lib/types";

export default function OrdersPage() {
  const { orders, dishes, stalls } = useStore();
  const list = orders;

  return (
    <Page>
      <Lead title="订单">线上单到摊取。货款在该摊商户里。</Lead>
      <Card>
        {list.length === 0 ? (
          <Empty>还没有线上单。证齐的摊可以点，到摊取，不配送。</Empty>
        ) : (
          list.map((row) => {
            const stall = stalls.find((s) => s.id === row.stallId);
            return (
              <Cell
                key={row.id}
                href={`/orders/${row.id}`}
                thumb={orderThumb(row, dishes) || (stall ? stallCover(stall) : undefined)}
                end={`${row.totalYuan} 元`}
              >
                <p className="font-display text-lg leading-none">取餐 {row.pickupNo}</p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  {row.slotNo && row.slotNo !== "—" ? `${row.slotNo}号摊 · ` : ""}
                  {row.vendorName} · {ORDER_STATUS[row.status]} · {row.items.map((item) => `${item.name}×${item.qty}`).join(" · ")}
                </p>
              </Cell>
            );
          })
        )}
      </Card>
    </Page>
  );
}
