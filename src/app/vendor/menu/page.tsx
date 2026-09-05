"use client";

import { FormEvent, useState } from "react";
import { Btn, Card, Cell, Empty, Lead, Page } from "@/components/mp";
import { useVendorDesk } from "@/lib/use-vendor";
import { DISH_PHOTOS, dishPhoto } from "@/lib/types";

export default function VendorMenuPage() {
  const { tenancy, myDishes, addDish, removeDish, toggleDishTonight, setDishPhoto } = useVendorDesk();
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("12");
  const [photo, setPhoto] = useState<string>(DISH_PHOTOS[0].src);

  function onAddDish(e: FormEvent) {
    e.preventDefault();
    if (!tenancy) return;
    addDish(tenancy.id, dishName, Number(dishPrice), photo);
    setDishName("");
  }

  function cyclePhoto(id: string, current: string) {
    const i = DISH_PHOTOS.findIndex((row) => row.src === current);
    const next = DISH_PHOTOS[(i + 1 + DISH_PHOTOS.length) % DISH_PHOTOS.length];
    setDishPhoto(id, next.src);
  }

  if (!tenancy || tenancy.status !== "active") {
    return (
      <Page>
        <Card>
          <Empty>先入驻。进场后才能写今晚卖什么。</Empty>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Lead title="今晚卖什么">
        {tenancy.licenseTier === "ordering"
          ? "证照已齐，这些菜可在小程序点单付款。"
          : "没证照：顾客在小程序里只能看。点单和付款在摊上。"}
      </Lead>
      <p className="stamp">{tenancy.licenseTier === "ordering" ? "可点单" : "仅展示"}</p>
      <Card>
        <form onSubmit={onAddDish} className="space-y-2 px-3.5 py-3">
          <div className="flex gap-2">
            <input
              className="mp-field min-w-0 flex-1"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="菜名"
            />
            <input
              className="mp-field w-16"
              type="number"
              min="1"
              value={dishPrice}
              onChange={(e) => setDishPrice(e.target.value)}
            />
            <Btn kind="ink" type="submit">
              加上
            </Btn>
          </div>
        </form>
        <div className="photo-picks">
          {DISH_PHOTOS.map((row) => (
            <button
              key={row.src}
              type="button"
              className={photo === row.src ? "is-on" : undefined}
              onClick={() => setPhoto(row.src)}
            >
              <img src={row.src} alt={row.label} />
            </button>
          ))}
        </div>
        {myDishes.length === 0 ? (
          <Empty>还没有菜。先写今晚卖什么。</Empty>
        ) : (
          myDishes.map((d) => {
            const src = dishPhoto(d);
            return (
              <Cell
                key={d.id}
                thumb={src}
                end={
                  <span className="flex gap-3">
                    <button type="button" onClick={() => cyclePhoto(d.id, src)}>
                      换图
                    </button>
                    <button type="button" onClick={() => toggleDishTonight(d.id)}>
                      {d.onTonight ? "停今晚" : "今晚卖"}
                    </button>
                    <button type="button" className="text-[var(--lacquer)]" onClick={() => removeDish(d.id)}>
                      删
                    </button>
                  </span>
                }
              >
                <p>
                  {d.name} · {d.priceYuan} 元
                </p>
                <p className="text-[13px] text-[var(--muted)]">{d.onTonight ? "今晚卖" : "先不卖"}</p>
              </Cell>
            );
          })
        )}
      </Card>
    </Page>
  );
}
