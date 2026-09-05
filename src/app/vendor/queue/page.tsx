"use client";

import { Btn, Card, CardHead, Cell, Empty, Lead, Page } from "@/components/mp";
import { useVendorDesk } from "@/lib/use-vendor";
import { ORDER_STATUS, orderThumb, type Dish, type Order } from "@/lib/types";

function Block({
  title,
  rows,
  dishes,
  action,
}: {
  title: string;
  rows: Order[];
  dishes: Dish[];
  action?: (row: Order) => { label: string; run: () => void };
}) {
  return (
    <Card>
      <CardHead>{title}</CardHead>
      {rows.length === 0 ? (
        <Empty>没有。</Empty>
      ) : (
        rows.map((row) => {
          const act = action?.(row);
          return (
          <Cell
            key={row.id}
            thumb={orderThumb(row, dishes)}
            end={
              act ? (
                <Btn kind="ghost" onClick={act.run}>
                  {act.label}
                </Btn>
              ) : (
                ORDER_STATUS[row.status]
              )
            }
          >
            <p className="font-display text-xl leading-none">取餐 {row.pickupNo}</p>
            <p className="text-[13px] text-[var(--muted)]">
              {row.items.map((item) => `${item.name}×${item.qty}`).join(" · ")} · {row.totalYuan} 元
            </p>
          </Cell>
          );
        })
      )}
    </Card>
  );
}

export default function VendorQueuePage() {
  const { tenancy, myOrders, myDishes, markOrder } = useVendorDesk();
  const placed = myOrders.filter((row) => row.status === "placed");
  const ready = myOrders.filter((row) => row.status === "ready");
  const picked = myOrders.filter((row) => row.status === "picked");
  const refunded = myOrders.filter((row) => row.status === "refunded");

  if (!tenancy || tenancy.status !== "active") {
    return (
      <Page>
        <Card>
          <Empty>先入驻。</Empty>
        </Card>
      </Page>
    );
  }

  if (tenancy.licenseTier !== "ordering") {
    return (
      <Page>
        <Lead title="接单">没开通点单，线上单不会来。现场买卖去收银页记。</Lead>
        <Card>
          <Empty>证照办齐、管场核过之后，顾客点的单会出现在这里。</Empty>
        </Card>
      </Page>
    );
  }

  if (!tenancy.allottedToday) {
    return (
      <Page>
        <Card>
          <Empty>今日没有摊位，接不到线上单。</Empty>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Lead title="接单">
        {tenancy.orderingPaused
          ? "管场暂停了新的线上单。手里的单还要出完。"
          : "出餐后叫号。顾客拿取餐号到摊取。"}
      </Lead>
      <Block
        title="待出餐"
        rows={placed}
        dishes={myDishes}
        action={(row) => ({ label: "出餐", run: () => markOrder(row.id, "ready") })}
      />
      <Block
        title="待取"
        rows={ready}
        dishes={myDishes}
        action={(row) => ({ label: "已取", run: () => markOrder(row.id, "picked") })}
      />
      {picked.length > 0 && <Block title="已取" rows={picked} dishes={myDishes} />}
      {refunded.length > 0 && <Block title="已退" rows={refunded} dishes={myDishes} />}
    </Page>
  );
}
