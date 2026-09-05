"use client";

import { Btn, Card, CardHead, Cell, Empty, Lead, Page, PaperHero, Stats } from "@/components/mp";
import { useVendorDesk } from "@/lib/use-vendor";
import { dishPhoto, photoByName, stallCover } from "@/lib/types";

export default function VendorDeskPage() {
  const { tenancy, tonightDishes, mySales, tonightYuan, recordStallSale } = useVendorDesk();

  if (!tenancy || tenancy.status !== "active") {
    return (
      <Page>
        <Card>
          <Empty>先入驻。占到位才能记现场单。</Empty>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      {tenancy && <PaperHero src={stallCover(tenancy)} kicker="收银" title={tenancy.vendorName} note="线上单和摊上记在同一本" />}
      <Stats
        items={[
          { label: "今晚已记", value: `${tonightYuan}元` },
          { label: "笔数", value: mySales.length },
        ]}
      />
      <Lead title="现场收银">
        {tenancy.allottedToday
          ? tenancy.licenseTier === "ordering"
            ? "线上单和现场单记在同一本流水。出餐去接单页。"
            : "钱在摊上收，记一笔方便对数。"
          : "今日没有摊位，占到位才能记现场单。"}
      </Lead>
      {tenancy.allottedToday && tonightDishes.length > 0 && (
        <Card>
          {tonightDishes.map((d) => (
            <Cell
              key={d.id}
              thumb={dishPhoto(d)}
              end={
                <Btn kind="ghost" onClick={() => recordStallSale(tenancy.id, d.id)}>
                  卖出一单
                </Btn>
              }
            >
              <p>
                {d.name} · {d.priceYuan} 元
              </p>
            </Cell>
          ))}
        </Card>
      )}
      <Card>
        <CardHead>
          今晚已记 {mySales.length} 单 · {tonightYuan} 元
        </CardHead>
        {mySales.length === 0 ? (
          <Empty>还没有记下的单。</Empty>
        ) : (
          mySales.slice(0, 12).map((row) => (
            <Cell key={row.id} thumb={photoByName(row.dishName)} end={`${row.priceYuan} 元`}>
              <p>
                {row.dishName} · {row.channel === "stall" ? "摊上" : "小程序"}
              </p>
            </Cell>
          ))
        )}
      </Card>
    </Page>
  );
}
