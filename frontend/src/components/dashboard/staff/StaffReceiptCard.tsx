/**
 * StaffReceiptCard — compact completion receipt for a finished pickup.
 */
import { Receipt } from "lucide-react";
import { Card } from "@/components/common";
import type { HandoffReceipt } from "./StaffTypes";

export function ReceiptCard({
  receipt,
  highlight,
}: {
  receipt: HandoffReceipt;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`p-4 bg-card border-border ${
        highlight
          ? "ring-2 ring-success/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
          : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
          <Receipt size={16} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {receipt.residentName}
            <span className="ml-1.5 font-normal text-muted-foreground">
              · Unit {receipt.unit}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {receipt.carrier} · <span className="font-mono text-xs">{receipt.tracking}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Received by <span className="font-medium text-foreground">{receipt.recipientName}</span>
            </span>
            <span>
              Completed by <span className="font-medium text-foreground">{receipt.completedBy}</span>
            </span>
            {receipt.completedAt !== "—" && (
              <span>{new Date(receipt.completedAt).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
