import { ImageResponse } from "next/og";
import { PLAN_SIZE, TABLES, type TableDef } from "@/lib/reservation/tables";

/**
 * Floor plan as PNG for Telegram, drawn after the restaurant's own sketch:
 * free tables slate, occupied tables red with guests + arrival time, the
 * booking that triggered the message outlined in white. Text stays Latin/digits
 * (default OG font); the Russian details go into the photo caption.
 */

export type PlanMark = {
  tables: number[];
  guests: number;
  time: string;
  walkIn?: boolean;
  highlight?: boolean;
};

const SCALE = 2;
const HEADER = 150;
const FOOTER = 90;
const WIDTH = PLAN_SIZE.w * SCALE;
const HEIGHT = HEADER + PLAN_SIZE.h * SCALE + FOOTER;

const COLORS = {
  bg: "#04181A",
  free: "#2B3342",
  freeChair: "#465063",
  busy: "#D91F2D",
  busyChair: "#8E1220",
  text: "#FFFFFF",
  muted: "#9AA7A8",
};

function Chairs({ t, busy }: { t: TableDef; busy: boolean }) {
  const color = busy ? COLORS.busyChair : COLORS.freeChair;
  const s = SCALE;
  const bars: { left: number; top: number; width: number; height: number }[] = [];
  const along = (n: number, length: number) =>
    Array.from({ length: n }, (_, i) => ((i + 0.5) * length) / n);
  for (const cx of along(t.chairs.top ?? 0, t.w)) bars.push({ left: (t.x + cx - 11) * s, top: (t.y - 4) * s, width: 22 * s, height: 4 * s });
  for (const cx of along(t.chairs.bottom ?? 0, t.w)) bars.push({ left: (t.x + cx - 11) * s, top: (t.y + t.h) * s, width: 22 * s, height: 4 * s });
  for (const cy of along(t.chairs.left ?? 0, t.h)) bars.push({ left: (t.x - 4) * s, top: (t.y + cy - 13) * s, width: 4 * s, height: 26 * s });
  for (const cy of along(t.chairs.right ?? 0, t.h)) bars.push({ left: (t.x + t.w) * s, top: (t.y + cy - 13) * s, width: 4 * s, height: 26 * s });
  return (
    <>
      {bars.map((b, i) => (
        <div key={i} style={{ position: "absolute", ...b, background: color, borderRadius: 3 }} />
      ))}
    </>
  );
}

function Table({ t, mark }: { t: TableDef; mark?: PlanMark }) {
  const busy = Boolean(mark);
  return (
    <>
      <Chairs t={t} busy={busy} />
      <div
        style={{
          position: "absolute",
          left: t.x * SCALE,
          top: t.y * SCALE,
          width: t.w * SCALE,
          height: t.h * SCALE,
          background: busy ? COLORS.busy : COLORS.free,
          borderRadius: 6,
          border: mark?.highlight ? "5px solid #FFFFFF" : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.text,
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{String(t.id)}</div>
        {mark && (
          <div style={{ fontSize: mark.walkIn ? 17 : 20, marginTop: 6, lineHeight: 1 }}>
            {`${mark.walkIn ? "W · " : ""}${mark.guests}P · ${mark.time}`}
          </div>
        )}
      </div>
    </>
  );
}

function LegendItem({ color, outline, label }: { color: string; outline?: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginRight: 40 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 6,
          background: color,
          border: outline ? "4px solid #FFFFFF" : "none",
          marginRight: 12,
        }}
      />
      <div style={{ fontSize: 26, color: COLORS.muted }}>{label}</div>
    </div>
  );
}

export async function renderPlan({
  title,
  subtitle,
  marks,
}: {
  title: string;
  subtitle: string;
  marks: PlanMark[];
}): Promise<Buffer> {
  const byTable = new Map<number, PlanMark>();
  for (const mark of marks) for (const id of mark.tables) byTable.set(id, mark);

  const image = new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", flexDirection: "column", background: COLORS.bg }}>
        <div style={{ height: HEADER, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 44px" }}>
          <div style={{ fontSize: 46, fontWeight: 700, color: COLORS.text }}>{title}</div>
          <div style={{ fontSize: 28, color: COLORS.muted, marginTop: 8 }}>{subtitle}</div>
        </div>
        <div style={{ position: "relative", width: WIDTH, height: PLAN_SIZE.h * SCALE, display: "flex" }}>
          {TABLES.map((t) => (
            <Table key={t.id} t={t} mark={byTable.get(t.id)} />
          ))}
        </div>
        <div style={{ height: FOOTER, display: "flex", alignItems: "center", padding: "0 44px" }}>
          <LegendItem color={COLORS.free} label="frei" />
          <LegendItem color={COLORS.busy} label="besetzt" />
          <LegendItem color={COLORS.busy} outline label="neu" />
          <div style={{ fontSize: 24, color: COLORS.muted }}>W = Walk-in</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
  return Buffer.from(await image.arrayBuffer());
}
