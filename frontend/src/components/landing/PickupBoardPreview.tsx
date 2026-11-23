/**
 * PickupBoardPreview — the hero "device": an example desk pickup board inside the rim-lit DeviceFrame.
 * Rows advance through the pickup flow every few seconds and the hand-off counter rolls, so visitors
 * see the product working. Example data only (labelled as such); used on the landing and auth screens.
 */
import { useEffect, useRef, useState } from "react";
import { Badge, DeviceFrame, RollingNumber, labelClass, type BadgeTone } from "@/components/common";
import { cn } from "@/lib/utils";

const STAGES: { label: string; tone: BadgeTone }[] = [
  { label: "Scheduled", tone: "warning" },
  { label: "Prepping", tone: "prepared" },
  { label: "Ready", tone: "success" },
  { label: "Checked in", tone: "info" },
  { label: "Handed off", tone: "neutral" },
];

type Row = { slot: string; unit: string; name: string; pkgs: number; stage: number };
const INITIAL: Row[] = [
  { slot: "14:15", unit: "12B", name: "D. Alvarez", pkgs: 3, stage: 2 },
  { slot: "14:30", unit: "4F", name: "S. Nakamura", pkgs: 1, stage: 3 },
  { slot: "14:30", unit: "7A", name: "R. Okafor", pkgs: 2, stage: 1 },
  { slot: "14:45", unit: "21C", name: "M. Haddad", pkgs: 5, stage: 0 },
  { slot: "15:00", unit: "3E", name: "J. Park", pkgs: 1, stage: 0 },
];

function useClock() {
  // null on the server so SSR and the first client render match; the real time fills in after mount.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";
}

export function PickupBoardPreview({ className, compact = false }: { className?: string; compact?: boolean }) {
  const clock = useClock();
  const [rows, setRows] = useState(INITIAL);
  const [handedOff, setHandedOff] = useState(1284);
  const [changed, setChanged] = useState<number | null>(null);

  // Advance one row per tick, round-robin; a handed-off row recycles to "Scheduled".
  const rowsRef = useRef(INITIAL);
  useEffect(() => {
    let tick = 0;
    const t = setInterval(() => {
      const idx = tick++ % INITIAL.length;
      const next = rowsRef.current.map((r, i) => i === idx ? { ...r, stage: (r.stage + 1) % STAGES.length } : r);
      rowsRef.current = next;
      setRows(next);
      setChanged(idx);
      const moved = next[idx];
      if (moved?.stage === STAGES.length - 1) setHandedOff(n => n + moved.pkgs);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  return <figure className={cn("m-0", className)}>
    <figcaption className="sr-only">Example of the live pickup board the front desk sees.</figcaption>
    <DeviceFrame>
      <div className="flex items-center justify-between gap-4 border-b border-border bg-muted px-4 py-3">
        <span className={labelClass}>Pickup board · Tower A</span>
        <span className="font-mono text-[13px] tabular-nums text-foreground">{clock}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className={cn(labelClass, "h-8 px-4 text-left")}>Slot</th>
            <th scope="col" className={cn(labelClass, "px-2 text-left")}>Unit</th>
            <th scope="col" className={cn(labelClass, "px-2 text-left")}>Resident</th>
            {!compact && <th scope="col" className={cn(labelClass, "hidden px-2 text-left sm:table-cell")}>Pkgs</th>}
            <th scope="col" className={cn(labelClass, "px-4 text-right")}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const stage = STAGES[r.stage]!;
            return <tr key={r.unit} className={cn("border-t border-border transition-colors duration-700", changed === i && "bg-muted")}>
              <td className="h-11 px-4 font-mono tabular-nums">{r.slot}</td>
              <td className="px-2 font-display text-base font-semibold">{r.unit}</td>
              <td className={cn("max-w-[7rem] truncate px-2 sm:max-w-none", r.stage === 4 ? "text-muted-foreground" : "text-foreground")}>{r.name}</td>
              {!compact && <td className="hidden px-2 font-mono text-muted-foreground sm:table-cell">{r.pkgs}</td>}
              <td className="px-4 text-right"><Badge tone={stage.tone}>{stage.label}</Badge></td>
            </tr>;
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
          Handed off today
        </span>
        <RollingNumber value={handedOff} className="font-display text-lg font-medium" />
      </div>
    </DeviceFrame>
    <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-subtle-foreground">Example board</p>
  </figure>;
}
