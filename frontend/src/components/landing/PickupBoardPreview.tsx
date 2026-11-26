/**
 * PickupBoardPreview — a static, clearly labelled example of the front-desk console.
 *
 * Nothing here is live: no clock, no counters, no timers and no API data. The rows are sample
 * content, the title bar says "Example", and the whole picture is hidden from assistive tech
 * behind one descriptive caption.
 *
 * The layout follows its own width (container queries), so the same component works as the
 * wide hero panel on the landing page and as the narrower side panel on the auth screens:
 *   board ≥ 56rem → console sidebar appears      board ≥ 64rem → handoff detail appears
 *   list  ≥ 30rem → package column appears       list  ≥ 42rem → shelf column appears
 *
 * `fade` masks the bottom edge so the panel dissolves into the page instead of ending in a box.
 */
import { Check } from "lucide-react";
import { Badge, labelClass, type BadgeTone } from "@/components/common";
import { cn } from "@/lib/utils";

type Row = {
  slot: string; unit: string; name: string; carrier: string; tracking: string; shelf: string;
  status: string; tone: BadgeTone; selected?: boolean; done?: boolean;
};

/* Sample rows only. Status labels are the ones the real console uses. */
const ROWS: Row[] = [
  { slot: "09:30", unit: "3E", name: "Sam Rivera", carrier: "USPS", tracking: "EX-9400-1187", shelf: "B-2", status: "Picked up", tone: "neutral", done: true },
  { slot: "10:00", unit: "12B", name: "Dana Alvarez", carrier: "UPS", tracking: "EX-1Z84-2210", shelf: "A-3", status: "Identity verified", tone: "info", selected: true },
  { slot: "10:00", unit: "4F", name: "Sora Nakamura", carrier: "FedEx", tracking: "EX-7712-0934", shelf: "A-1", status: "Checked in", tone: "success" },
  { slot: "10:30", unit: "7A", name: "Remi Okafor", carrier: "Amazon", tracking: "EX-TBA3-5521", shelf: "C-4", status: "Prepared", tone: "prepared" },
  { slot: "11:00", unit: "21C", name: "Maya Haddad", carrier: "UPS", tracking: "EX-1Z84-2377", shelf: "A-2", status: "Scheduled", tone: "warning" },
  { slot: "11:30", unit: "9D", name: "Jun Park", carrier: "DHL", tracking: "EX-4409-7765", shelf: "B-5", status: "Scheduled", tone: "warning" },
  { slot: "12:00", unit: "15A", name: "Noor Hassan", carrier: "USPS", tracking: "EX-9400-1302", shelf: "C-1", status: "Scheduled", tone: "warning" },
  { slot: "12:30", unit: "2C", name: "Eli Brandt", carrier: "FedEx", tracking: "EX-7712-1048", shelf: "B-3", status: "Scheduled", tone: "warning" },
];

/* Section names from the staff console, in sentence case. */
const SECTIONS = ["Dashboard", "Register package", "Packages", "Today's pickups", "Preparation queue", "Handoff", "Residents", "History"];
const ACTIVE_SECTION = "Today's pickups";

const HANDOFF_STEPS = [
  { label: "Checked in", note: "09:58", done: true },
  { label: "Identity verified", note: "10:01", done: true },
  { label: "Sign-off", note: "Next", done: false },
  { label: "Complete pickup", note: "", done: false },
];

function Sidebar() {
  return (
    <div className="hidden w-[176px] shrink-0 border-r border-border px-2.5 py-3 @4xl/board:block">
      <ul className="space-y-0.5">
        {SECTIONS.map((label) => (
          <li
            key={label}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px]",
              label === ACTIVE_SECTION ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <span className={cn("size-1.5 rounded-full", label === ACTIVE_SECTION ? "bg-primary" : "bg-border-strong")} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PickupList() {
  return (
    <div className="@container/list min-w-0 flex-1">
      <div className="flex h-12 items-center justify-between gap-4 px-4">
        <span className="text-[15px] font-medium tracking-[-0.015em] text-foreground">Today's pickups</span>
        <span className="hidden text-[13px] text-muted-foreground @md/list:inline">In time order</span>
      </div>
      <div className={cn(labelClass, "flex h-8 items-center gap-3 border-y border-border bg-muted/50 px-4")}>
        <span className="w-11 shrink-0">Slot</span>
        <span className="w-9 shrink-0">Unit</span>
        <span className="min-w-0 flex-1">Resident</span>
        <span className="hidden min-w-0 flex-[1.3] @lg/list:block">Package</span>
        <span className="hidden w-12 shrink-0 @2xl/list:block">Shelf</span>
        <span className="w-[7.75rem] shrink-0 text-right">Status</span>
      </div>
      <ul>
        {ROWS.map((r) => (
          <li
            key={`${r.slot}-${r.unit}`}
            className={cn(
              "flex h-11 items-center gap-3 border-b border-border px-4 text-[13px]",
              r.selected && "bg-accent/60",
            )}
          >
            <span className="w-11 shrink-0 font-mono tabular-nums text-muted-foreground">{r.slot}</span>
            <span className="w-9 shrink-0 font-mono text-foreground">{r.unit}</span>
            <span className={cn("min-w-0 flex-1 truncate font-medium", r.done ? "text-muted-foreground" : "text-foreground")}>{r.name}</span>
            <span className="hidden min-w-0 flex-[1.3] items-baseline gap-2 truncate @lg/list:flex">
              <span className="text-muted-foreground">{r.carrier}</span>
              <span className="truncate font-mono text-[12px] text-muted-foreground">{r.tracking}</span>
            </span>
            <span className="hidden w-12 shrink-0 font-mono text-[12px] text-muted-foreground @2xl/list:block">{r.shelf}</span>
            <span className="flex w-[7.75rem] shrink-0 justify-end"><Badge tone={r.tone}>{r.status}</Badge></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HandoffDetail() {
  const row = ROWS.find((r) => r.selected) ?? ROWS[0]!;
  return (
    <div className="hidden w-[288px] shrink-0 border-l border-border @5xl/board:block">
      <div className="flex h-12 items-center px-4">
        <span className="text-[15px] font-medium tracking-[-0.015em] text-foreground">Handoff</span>
      </div>
      <div className="border-t border-border px-4 py-4">
        <p className="text-[15px] font-medium text-foreground">{row.name}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Unit <span className="font-mono">{row.unit}</span> · slot <span className="font-mono">{row.slot}</span></p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
          <dt className="text-muted-foreground">Carrier</dt>
          <dd className="text-foreground">{row.carrier}</dd>
          <dt className="text-muted-foreground">Tracking</dt>
          <dd className="font-mono text-[12px] text-foreground">{row.tracking}</dd>
          <dt className="text-muted-foreground">Shelf</dt>
          <dd className="font-mono text-[12px] text-foreground">{row.shelf}</dd>
        </dl>
      </div>
      <ol className="border-t border-border px-4 py-4">
        {HANDOFF_STEPS.map((step, i) => (
          <li key={step.label} className="relative flex items-center gap-3 pb-4 text-[13px] last:pb-0">
            {i < HANDOFF_STEPS.length - 1 && <span className="absolute left-[9px] top-5 h-[calc(100%-20px)] w-px bg-border" />}
            <span
              className={cn(
                "flex size-[19px] shrink-0 items-center justify-center rounded-full",
                step.done ? "tint-success text-success-foreground" : "border border-border-strong",
              )}
            >
              {step.done && <Check size={12} strokeWidth={2.4} />}
            </span>
            <span className={cn("flex-1", step.done ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
            <span className={cn("text-[12px] text-muted-foreground", step.done && "font-mono tabular-nums")}>{step.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PickupBoardPreview({ className, fade = false }: { className?: string; fade?: boolean }) {
  return (
    <figure className={cn("@container/board m-0", fade && "mask-b-from-55% mask-b-to-100%", className)}>
      <figcaption className="sr-only">
        Example of the front-desk console, with sample data: today's pickups listed in time order, each with its
        unit, resident, package and status, and the handoff steps for one pickup.
      </figcaption>
      <div aria-hidden="true" className="overflow-hidden rounded-xl border border-border bg-card shadow-bezel">
        <div className="flex h-11 items-center justify-between gap-3 border-b border-border bg-muted/50 px-4">
          <span className="flex min-w-0 items-center gap-2.5 text-[13px]">
            <span className="size-3 shrink-0 rounded-[3px] bg-primary" />
            <span className="truncate font-medium text-foreground">Front desk</span>
          </span>
          <Badge dot={false} className="border border-border-strong bg-card text-foreground">Example</Badge>
        </div>
        <div className="flex">
          <Sidebar />
          <PickupList />
          <HandoffDetail />
        </div>
      </div>
    </figure>
  );
}
