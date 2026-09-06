"use client";

import Link from "next/link";
import { LotMap, Page } from "@/components/mp";
import { useStore } from "@/lib/store";
import { boothState, stallCover, tonightBooths } from "@/lib/types";

/** 整张场图。名单页上只留了一个入口，图本身在这里。 */
export default function FloorPage() {
  const { venues, stalls } = useStore();
  const venue = venues[0];
  if (!venue) return <p>还没有经营点。</p>;
  const booths = tonightBooths(stalls.filter((s) => s.venueId === venue.id), venue.floor);
  const lit = booths.filter(({ stall }) => boothState(stall) === "open");

  return (
    <Page>
      <header className="tonight-head">
        <h2>今晚场图</h2>
        <p className="tonight-tally">
          <i className="tonight-dot" />
          <strong>{lit.length} 格亮着</strong>
          {` · 共 ${venue.floor.plots.length} 格 · ${venue.floor.gate.label}从这边进`}
        </p>
      </header>
      <div className="ticket overflow-hidden">
        <LotMap
          floor={venue.floor}
          hrefFor={(id) => `/stall/${id}`}
          booths={lit.map(({ stall, slotNo, plot }) => ({
            slotNo,
            cover: stallCover(stall),
            name: stall.vendorName,
            stallId: stall.id,
            plotId: plot?.id || stall.lotPlotId,
          }))}
        />
      </div>
      <p className="px-1 pt-1 text-[12px] text-[var(--muted)]">红格是已亮灯的摊，点开就是菜单。空格今晚没人。</p>
      <Link href="/" className="mp-btn mp-btn-ghost">
        回今晚名单
      </Link>
    </Page>
  );
}
