import { ImageResponse } from "next/og";
import { PLAN_SIZE, TABLES, type TableDef } from "@/lib/reservation/tables";

/**
 * Floor plan as PNG for Telegram, drawn after the restaurant's own sketch:
 * free tables slate, occupied tables red with guests + arrival time, the
 * booking that triggered the message outlined in white, a booking's comment
 * ("vegan") as a yellow tag under its table. Text stays Latin/digits (default
 * OG font); the Russian details go into the photo caption.
 */

export type PlanMark = {
  tables: number[];
  guests: number;
  time: string;
  walkIn?: boolean;
  highlight?: boolean;
  note?: string | null;
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
  note: "#F5C542",
  noteText: "#1A1A1A",
  text: "#FFFFFF",
  muted: "#9AA7A8",
};

const NOTE_WIDTH = 190;
const NOTE_CHARS = 26;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

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

function markLabel(mark: PlanMark) {
  return `${mark.walkIn ? "W · " : ""}${mark.guests}P · ${mark.time}`;
}

function Table({ t, marks }: { t: TableDef; marks: PlanMark[] }) {
  const busy = marks.length > 0;
  const shown = marks.slice(0, 3);
  const hidden = marks.length - shown.length;
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
          border: marks.some((m) => m.highlight) ? "5px solid #FFFFFF" : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.text,
        }}
      >
        <div style={{ fontSize: marks.length > 1 ? 26 : 34, fontWeight: 700, lineHeight: 1 }}>{String(t.id)}</div>
        {marks.length === 1 && (
          <div style={{ fontSize: marks[0]!.walkIn ? 17 : 20, marginTop: 6, lineHeight: 1 }}>{markLabel(marks[0]!)}</div>
        )}
        {marks.length > 1 &&
          shown.map((m, i) => (
            <div key={i} style={{ fontSize: 16, marginTop: 3, lineHeight: 1 }}>
              {i === shown.length - 1 && hidden ? `${markLabel(m)} +${hidden}` : markLabel(m)}
            </div>
          ))}
      </div>
      <NoteTag t={t} marks={marks} />
    </>
  );
}

/** Joined tables show a booking's comment once, under the lowest of them. */
function noteAnchor(tables: number[]) {
  const defs = TABLES.filter((t) => tables.includes(t.id));
  return defs.reduce((low, t) => (t.y + t.h > low.y + low.h ? t : low), defs[0]!).id;
}

/** Comments of the table's bookings, as a tag right under the table. */
function NoteTag({ t, marks }: { t: TableDef; marks: PlanMark[] }) {
  const notes = [
    ...new Set(
      marks
        .filter((m) => noteAnchor(m.tables) === t.id)
        .map((m) => m.note?.replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ),
  ];
  if (!notes.length) return null;
  const center = t.x + t.w / 2;
  const left = Math.min(Math.max(center - NOTE_WIDTH / 2, 4), PLAN_SIZE.w - NOTE_WIDTH - 4);
  const align = left === 4 ? "flex-start" : left === PLAN_SIZE.w - NOTE_WIDTH - 4 ? "flex-end" : "center";
  const top = t.y + t.h + (t.chairs.bottom ? 7 : 3);
  return (
    <div
      style={{
        position: "absolute",
        left: left * SCALE,
        top: top * SCALE,
        width: NOTE_WIDTH * SCALE,
        display: "flex",
        justifyContent: align,
      }}
    >
      <div
        style={{
          background: COLORS.note,
          color: COLORS.noteText,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1,
          padding: "5px 10px",
          borderRadius: 6,
        }}
      >
        {clip(notes.join(" · "), NOTE_CHARS)}
      </div>
    </div>
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
  const byTable = new Map<number, PlanMark[]>();
  const ordered = [...marks].sort((a, b) => a.time.localeCompare(b.time));
  for (const mark of ordered) for (const id of mark.tables) byTable.set(id, [...(byTable.get(id) ?? []), mark]);

  const image = new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", flexDirection: "column", background: COLORS.bg }}>
        <div style={{ height: HEADER, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 44px" }}>
          <div style={{ fontSize: 46, fontWeight: 700, color: COLORS.text }}>{title}</div>
          <div style={{ fontSize: 28, color: COLORS.muted, marginTop: 8 }}>{subtitle}</div>
        </div>
        <div style={{ position: "relative", width: WIDTH, height: PLAN_SIZE.h * SCALE, display: "flex" }}>
          {TABLES.map((t) => (
            <Table key={t.id} t={t} marks={byTable.get(t.id) ?? []} />
          ))}
        </div>
        <div style={{ height: FOOTER, display: "flex", alignItems: "center", padding: "0 44px" }}>
          <LegendItem color={COLORS.free} label="frei" />
          <LegendItem color={COLORS.busy} label="besetzt" />
          <LegendItem color={COLORS.busy} outline label="neu" />
          <LegendItem color={COLORS.note} label="Notiz" />
          <div style={{ fontSize: 24, color: COLORS.muted }}>W = Walk-in</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
  return Buffer.from(await image.arrayBuffer());
}
