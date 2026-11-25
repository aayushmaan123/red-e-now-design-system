/**
 * StaffHistory — completed pickups for today.
 */
import { History } from "lucide-react";
import { Card, EmptyState } from "@/components/common";
import { BuildingName, useStaff } from "./StaffContext";
import { toReceipt } from "./StaffTypes";
import { ReceiptCard } from "./StaffReceiptCard";

export function StaffHistory() {
  const { completedToday, completionInfo } = useStaff();

  return (
    <>
      <div className="mb-7 animate-fade-in">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <BuildingName /> / Management
        </p>
        <h1 className="font-display text-[38px] font-semibold leading-none">
          History
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {completedToday.length} pickup{completedToday.length !== 1 ? "s" : ""} completed today.
        </p>
      </div>

      <h2 className="mb-4 font-display text-[23px] font-semibold animate-fade-in">
        Completed Today
      </h2>

      {completedToday.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {completedToday.map((a, i) => (
            <div key={a.id} className={`animate-fade-in${Math.min(i + 1, 6)}`}>
              <ReceiptCard
                receipt={toReceipt(
                  a,
                  completionInfo[a.id]?.at ?? null,
                  completionInfo[a.id]?.by ?? null
                )}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="max-w-3xl animate-fade-in bg-card border-border">
          <EmptyState icon={History} message="No pickups completed today yet" />
        </Card>
      )}
    </>
  );
}
