/**
 * Small, static examples of the screen each "How it works" step happens on.
 * They are pictures, not controls: sample content, labelled "Example", hidden from
 * assistive tech (the step text beside them says the same thing in words).
 */
import type { ReactNode } from "react";
import { Check, Package } from "lucide-react";
import { StatusBadge, labelClass } from "@/components/common";
import { cn } from "@/lib/utils";

function Vignette({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div aria-hidden="true" className="flex min-h-[14rem] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border px-3.5">
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        <span className={labelClass}>Example</span>
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}

/** Step 01 — the resident's package list: carrier, tracking number, status. */
export function ArrivesVignette() {
  const rows = [
    { carrier: "UPS", tracking: "EX-1Z84-2210", note: "Arrived today, 9:12 AM", status: "available" },
    { carrier: "USPS", tracking: "EX-9400-1187", note: "Arrived today, 11:40 AM", status: "received" },
  ] as const;
  return (
    <Vignette title="Your packages">
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.tracking} className="flex items-start gap-3 px-3.5 py-3.5">
            <Package size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{r.carrier}</p>
              <p className="mt-0.5 truncate font-mono text-[12px] text-foreground/90">{r.tracking}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{r.note}</p>
            </div>
            <StatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </Vignette>
  );
}

/** Step 02 — choosing a day and a pickup window; each slot shows the places left. */
export function SlotVignette() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const slots = [
    { time: "10:00", left: "2 remaining" },
    { time: "10:30", left: "4 remaining", selected: true },
    { time: "11:00", left: "1 remaining" },
    { time: "11:30", left: "4 remaining" },
    { time: "12:00", left: "3 remaining" },
    { time: "12:30", left: "4 remaining" },
  ];
  return (
    <Vignette title="Pick a time">
      <div className="px-3.5 py-3.5">
        <div className="grid grid-cols-5 gap-1.5">
          {days.map((d) => (
            <span
              key={d}
              className={cn(
                "flex h-7 items-center justify-center rounded-md text-[12px]",
                d === "Wed" ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {d}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {slots.map((s) => (
            <span
              key={s.time}
              className={cn(
                "rounded-md border px-2.5 py-2",
                s.selected ? "tint-primary border-primary" : "border-border",
              )}
            >
              <span className="block font-mono text-[13px] tabular-nums text-foreground">{s.time}</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{s.left}</span>
            </span>
          ))}
        </div>
      </div>
    </Vignette>
  );
}

/** Step 03 — the verified handoff: check-in, identity, sign-off, completion. */
export function HandoffVignette() {
  const steps = [
    { label: "Checked in from phone", time: "10:28" },
    { label: "Identity verified", time: "10:30" },
    { label: "Signed for", time: "10:31" },
    { label: "Pickup completed", time: "10:31" },
  ];
  return (
    <Vignette title="Handoff">
      <ol className="px-3.5 py-3.5">
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex items-center gap-3 pb-3.5 text-[13px] last:pb-0">
            {i < steps.length - 1 && <span className="absolute left-[9px] top-5 h-[calc(100%-20px)] w-px bg-border" />}
            <span className="tint-success flex size-[19px] shrink-0 items-center justify-center rounded-full text-success-foreground">
              <Check size={12} strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground">{s.label}</span>
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{s.time}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-border px-3.5 py-2.5 text-[12px] text-muted-foreground">Receipt saved to the resident's history</p>
    </Vignette>
  );
}
