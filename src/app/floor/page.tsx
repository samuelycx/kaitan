"use client";

import Link from "next/link";
import { useState } from "react";
import { Page } from "@/components/mp";
import { useStore } from "@/lib/store";
import { boothState, stallCover, tonightBooths } from "@/lib/types";

/**
 * 场图。左右两列格子隔着通道，场口在上头。亮灯的实心、占了位没来的空心、
 * 今晚没人的就是一块底色。点一格，底下那条就换成这摊，再点「看菜单」进去。
 */
export default function FloorPage() {
  const { venues, stalls } = useStore();
  const [picked, setPicked] = useState<string | null>(null);
  const venue = venues[0];
  if (!venue) return <p>还没有经营点。</p>;

  const booths = tonightBooths(
    stalls.filter((s) => s.venueId === venue.id),
    venue.floor,
  );
  const byPlot = new Map(booths.map((row) => [row.plot?.id || row.stall.lotPlotId, row]));
  const lit = booths.filter(({ stall }) => boothState(stall) === "open");
  const waiting = booths.filter(({ stall }) => boothState(stall) === "waiting");
  const mid = venue.floor.width / 2;
  const columns = [
    venue.floor.plots.filter((p) => p.x < mid),
    venue.floor.plots.filter((p) => p.x >= mid),
  ];
  const chosen = picked ? byPlot.get(picked) : lit[0];

  return (
    <Page>
      <header className="floor-head">
        <h2>场图</h2>
        <p>
          {venue.floor.plots.length} 个摊位 · {venue.floor.gate.label}朝北
        </p>
        <div className="floor-legend">
          <span>
            <i className="is-lit" />已亮灯 {lit.length}
          </span>
          <span>
            <i className="is-wait" />占位未到 {waiting.length}
          </span>
          <span>
            <i className="is-empty" />今晚空 {venue.floor.plots.length - booths.length}
          </span>
        </div>
      </header>
      <div className="floor-board">
        <p className="floor-gate-line">
          <span />
          {venue.floor.gate.label}
          <span />
        </p>
        <div className="floor-cols">
          {columns.map((plots, col) => (
            <div key={col} className="floor-col">
              {plots.map((plot) => {
                const booth = byPlot.get(plot.id);
                const state = booth ? boothState(booth.stall) : "empty";
                return (
                  <button
                    key={plot.id}
                    type="button"
                    className={`floor-cell is-${state}${picked === plot.id ? " is-picked" : ""}`}
                    style={{ flex: plot.h / 30 }}
                    onClick={() => setPicked(booth ? plot.id : null)}
                  >
                    <span className="floor-cell-no">{plot.no}</span>
                    {booth && state !== "packed" && <span className="floor-cell-name">{booth.stall.vendorName}</span>}
                    {booth && state === "packed" && <span className="floor-cell-name">已收摊</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <span className="floor-aisle-label">通道</span>
        </div>
      </div>
      {chosen && (
        <div className="floor-pick">
          <img src={stallCover(chosen.stall)} alt="" />
          <div>
            <p>
              {chosen.stall.vendorName}
              <span className="plot-chip">{chosen.slotNo}</span>
            </p>
            <small>
              {boothState(chosen.stall) === "open"
                ? "已亮灯 · 现在能吃"
                : boothState(chosen.stall) === "waiting"
                  ? "占了位 · 人还没到"
                  : "今晚已收摊"}
            </small>
          </div>
          <Link href={`/stall/${chosen.stall.id}`}>看菜单</Link>
        </div>
      )}
    </Page>
  );
}
