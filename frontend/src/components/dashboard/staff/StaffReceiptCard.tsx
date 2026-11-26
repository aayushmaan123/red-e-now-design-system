/**
 * ReceiptRow — one finished pickup: who collected what, from where, and when.
 * Rendered inside a Panel (one row per pickup, hairline dividers between rows).
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HandoffReceipt } from "./StaffTypes";
import { formatDateTime } from "./format";
import { Mono } from "./ui";

export function ReceiptRow({
  receipt,
  showStaff = true,
  className,
}: {
  receipt: HandoffReceipt;
  /** Hide "Handed over by" when the staff member is not known yet. */
  showStaff?: boolean;
  className?: string;
}) {
  const when = formatDateTime(receipt.completedAt);
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3", className)}>
      <span className="tint-success mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-success-foreground">
        <Check size={14} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <p className="min-w-0 truncate text-sm font-medium">
            {receipt.residentName}
            <Mono className="ml-2 font-normal text-muted-foreground">{receipt.unit}</Mono>
          </p>
          {when !== "—" && <Mono className="shrink-0 text-muted-foreground">{when}</Mono>}
        </div>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[13px] text-muted-foreground">
          <span>{receipt.carrier}</span>
          <Mono className="break-all text-foreground">{receipt.tracking}</Mono>
          <span aria-hidden="true">·</span>
          <Mono>{receipt.location}</Mono>
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Received by <span className="text-foreground">{receipt.recipientName}</span>
          {showStaff && <> · Handed over by <span className="text-foreground">{receipt.completedBy}</span></>}
        </p>
      </div>
    </div>
  );
}
