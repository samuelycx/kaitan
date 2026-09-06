import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { plotFits, plotUseLabel } from "@/lib/lot";
import type { VenueFloor } from "@/lib/types";

export function Page({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

export function Lead({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <header className="px-0.5">
      {kicker && <p className="text-[11px] tracking-[0.18em] text-[var(--lacquer)]">{kicker}</p>}
      <h2 className="mt-1 font-display text-[1.65rem] leading-none">{title}</h2>
      {children && <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">{children}</p>}
    </header>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <section className="ticket overflow-hidden">{children}</section>;
}

export function CardHead({ children }: { children: ReactNode }) {
  return <div className="px-3.5 pb-1 pt-3 text-[13px] text-[var(--muted)]">{children}</div>;
}

export function Cell({
  href,
  children,
  end,
  thumb,
}: {
  href?: string;
  children: ReactNode;
  end?: ReactNode;
  thumb?: string;
}) {
  const inner = (
    <>
      {thumb && <img src={thumb} alt="" className="cell-thumb" />}
      <div className="min-w-0 flex-1">{children}</div>
      {end && <div className="shrink-0 text-[13px] text-[var(--muted)]">{end}</div>}
    </>
  );
  const cls = "mp-cell flex items-center gap-3 px-3.5 py-3";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-10 text-center font-display text-[15px] leading-relaxed text-[var(--muted)]">{children}</p>
  );
}

export function PaperHero({
  src,
  kicker,
  title,
  note,
}: {
  src: string;
  kicker?: string;
  title: string;
  note?: string;
}) {
  return (
    <section className="paper-hero">
      <img src={src} alt="" />
      <div className="paper-hero-veil">
        {kicker && <p>{kicker}</p>}
        <h3>{title}</h3>
        {note && <small>{note}</small>}
      </div>
    </section>
  );
}

export function Btn({
  kind = "ink",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "ink" | "lacquer" | "ghost" | "text" | "danger" }) {
  return <button type="button" className={`mp-btn mp-btn-${kind} ${className}`} {...props} />;
}

/** 位号牌。亮灯的实心朱红，没到场的空心——牌子本身就说了到没到。 */
export function PlotChip({ no, on = true }: { no: string; on?: boolean }) {
  return <span className={`plot-chip${on ? "" : " is-off"}`}>{no}</span>;
}

/** 段头：楷体小标题、一条穿过去的细线、右边一句人话。 */
export function Band({ title, note, tone }: { title: string; note?: string; tone?: "open" }) {
  return (
    <div className={`band${tone === "open" ? " is-open" : ""}`}>
      <h3>{title}</h3>
      <span className="band-rule" />
      {note && <small>{note}</small>}
    </div>
  );
}

/**
 * 场图在名单页上只占一行。顾客先在名单里挑摊，挑定了才需要找位置，
 * 所以整张图收在这道门后面，不跟名单抢地方。
 */
export function FloorEntry({ href, note }: { href: string; note: string }) {
  return (
    <Link href={href} className="floor-entry">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={col * 12}
              y={row * 12}
              width="10"
              height="10"
              fill={(row + col) % 2 === 0 ? "#c23b22" : "#c9b795"}
            />
          )),
        )}
      </svg>
      <span className="floor-entry-text">
        <b>看场图找位置</b>
        <small>{note}</small>
      </span>
      <span className="floor-entry-go">›</span>
    </Link>
  );
}

/**
 * 名单里的一摊。到没到场不写成标签：到了就是正常一行，没到场整行褪下去、
 * 图去色、位号牌变空心，末行改说报名时间。
 */
export function StallRow({
  href,
  cover,
  name,
  plotNo,
  category,
  fromYuan,
  queue,
  state,
  waitNote,
}: {
  href: string;
  cover: string;
  name: string;
  plotNo: string;
  category: string;
  fromYuan?: number;
  queue?: string;
  state: string;
  waitNote?: string;
}) {
  const on = state === "open";
  return (
    <Link href={href} className={`stall-row is-${state}`}>
      <img src={cover} alt="" />
      <div className="stall-row-body">
        <div className="stall-row-name">
          <h4>{name}</h4>
          <PlotChip no={plotNo} on={on} />
        </div>
        <p className="stall-row-cat">{category}</p>
        <div className="stall-row-foot">
          {on ? (
            <>
              {fromYuan !== undefined && <span>{fromYuan} 元起</span>}
              {queue && <small>{queue}</small>}
            </>
          ) : (
            <small>{waitNote}</small>
          )}
        </div>
      </div>
    </Link>
  );
}

export function LotMap({
  floor,
  booths,
  highlightId,
  hrefFor,
  pickFor,
  pickCategory,
}: {
  floor?: VenueFloor;
  booths: { slotNo: string; cover: string; name: string; stallId?: string; plotId?: string }[];
  highlightId?: string;
  hrefFor?: (stallId: string) => string;
  pickFor?: (plotId: string) => void;
  pickCategory?: string;
}) {
  if (!floor?.plots.length) return null;
  const byPlot = new Map(booths.map((row) => [row.plotId || "", row]));
  return (
    <div className="lot-wrap">
      <p className="lot-gate">{floor.gate.label}从这边进 · 格子大小按业态</p>
      <div className="floor-scroll">
        <svg className="floor-svg" viewBox={`0 0 ${floor.width} ${floor.height}`} role="img" aria-label="场地摊位图">
          <rect className="floor-ground" x="0" y="0" width={floor.width} height={floor.height} />
          <rect className="floor-aisle" x={floor.width / 2 - 32} y="24" width="64" height={floor.height - 36} />
          <text className="floor-aisle-label" x={floor.width / 2} y={floor.height / 2} textAnchor="middle">
            过道
          </text>
          {floor.plots.map((plot) => {
            const booth = byPlot.get(plot.id);
            const mine = Boolean(booth && highlightId && booth.stallId === highlightId);
            const href = booth?.stallId && hrefFor ? hrefFor(booth.stallId) : undefined;
            const canPick = Boolean(pickFor && !booth && (!pickCategory || plotFits(pickCategory, plot)));
            const cls = `floor-plot is-${plot.use}${booth ? " is-on" : ""}${mine ? " is-me" : ""}${canPick ? " is-pick" : ""}`;
            const title = booth ? `${plot.no} ${booth.name}` : `${plot.no} 空 · ${plotUseLabel(plot.use)}`;
            const body = (
              <>
                {booth && <image href={booth.cover} x={plot.x} y={plot.y} width={plot.w} height={plot.h} preserveAspectRatio="xMidYMid slice" />}
                <rect className={cls} x={plot.x} y={plot.y} width={plot.w} height={plot.h} />
                <text className="floor-no" x={plot.x + 5} y={plot.y + plot.h - 6}>
                  {plot.no}
                </text>
              </>
            );
            if (href) {
              return (
                <Link key={plot.id} href={href} className="floor-hit">
                  <title>{title}</title>
                  {body}
                </Link>
              );
            }
            if (canPick && pickFor) {
              return (
                <g key={plot.id} className="floor-hit" role="button" tabIndex={0} onClick={() => pickFor(plot.id)}>
                  <title>{title}</title>
                  {body}
                </g>
              );
            }
            return (
              <g key={plot.id}>
                <title>{title}</title>
                {body}
              </g>
            );
          })}
          <text className="floor-gate" x={floor.gate.x} y={floor.gate.y} textAnchor="middle">
            ↓ {floor.gate.label}
          </text>
        </svg>
      </div>
      <p className="lot-legend">
        小吃格 · 水果宽位 · 炭火深位 · 便民小位
      </p>
    </div>
  );
}

export function StallPoster({
  href,
  cover,
  slotNo,
  name,
  category,
  blurb,
  pay,
  rating,
  dishes,
  state,
  stateKind,
}: {
  href: string;
  cover: string;
  slotNo: string;
  name: string;
  category: string;
  blurb: string;
  pay: string;
  rating?: string;
  state?: string;
  stateKind?: string;
  dishes: { id: string; name: string; priceYuan: number; photo: string }[];
}) {
  return (
    <Link href={href} className="stall-poster">
      <div className="stall-poster-cover">
        <img src={cover} alt="" />
        <span className="stall-plaque">{slotNo}</span>
        <span className="stamp stall-poster-stamp">{pay}</span>
        {state && <span className={`booth-state is-${stateKind ?? "open"}`}>{state}</span>}
      </div>
      <div className="stall-poster-body">
        <p className="stall-poster-cat">{category}</p>
        <h3>{name}</h3>
        {rating && <p className="stall-poster-rate">{rating}</p>}
        {blurb && <p className="stall-poster-blurb">{blurb}</p>}
        {dishes.length > 0 && (
          <div className="dish-strip">
            {dishes.slice(0, 4).map((d) => (
              <figure key={d.id}>
                <img src={d.photo} alt="" />
                <figcaption>
                  {d.name}
                  <em>{d.priceYuan}元</em>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function Stats({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className={`grid gap-2 ${items.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {items.map((item) => (
        <div key={item.label} className="ticket px-2.5 py-2.5 text-center">
          <p className="text-[11px] text-[var(--muted)]">{item.label}</p>
          <p className="mt-0.5 font-display text-2xl leading-none">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
