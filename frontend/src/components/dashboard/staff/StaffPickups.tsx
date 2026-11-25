/**
 * StaffPickups — Today's Pickups + Upcoming merged view.
 * Shows handoff progress, receipt cards for completed pickups.
 */
import { CalendarDays } from "lucide-react";
import { Button, Card, EmptyState, StatusBadge } from "@/components/common";
import { useStaff } from "./StaffContext";
import { handoffStage, formatTime, toReceipt } from "./StaffTypes";
import { HandoffBadge, ExceptionBadge } from "./StaffBadges";
import { ReceiptCard } from "./StaffReceiptCard";
import type { PackageStatus } from "@/api/packagesApi";

export function StaffPickups() {
  const {
    section, todaysPickups, activeAppointments, todayKey,
    appointmentsLoading, appointmentsError, handoffError,
    fetchAppointments, renderHandoffActions,
    hasException, completionInfo,
  } = useStaff();

  const list =
    section === "Today's Pickups"
      ? todaysPickups
      : activeAppointments.filter((a) => a.pickup_start.slice(0, 10) >= todayKey);

  return (
    <>
      <div className="mb-7 animate-fade-in">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Oakwood Residences / Management
        </p>
        <h1 className="font-display text-[38px] font-semibold leading-none">
          {section}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {section === "Today's Pickups"
            ? "Residents check in from their app — verify, sign off and complete each handoff here."
            : "Scheduled pickups for the coming days."}
        </p>
      </div>

      <Button
        variant="secondary"
        onClick={fetchAppointments}
        disabled={appointmentsLoading}
        className="mb-5"
      >
        {appointmentsLoading ? "Refreshing..." : "Refresh Appointments"}
      </Button>

      {appointmentsError && (
        <p role="alert" className="mb-4 text-sm text-destructive">{appointmentsError}</p>
      )}
      {section === "Today's Pickups" && handoffError && (
        <p role="alert" className="mb-4 text-sm text-destructive">{handoffError}</p>
      )}

      <div className="space-y-3">
        {list.map((appointment, i) => {
          const stage = handoffStage(appointment);
          if (stage === "Completed") {
            return (
              <div key={appointment.id} className={`animate-fade-in${Math.min(i + 1, 6)}`}>
                <ReceiptCard
                  receipt={toReceipt(
                    appointment,
                    completionInfo[appointment.id]?.at ?? appointment.handed_off_at ?? null,
                    completionInfo[appointment.id]?.by ?? null
                  )}
                />
              </div>
            );
          }
          return (
            <Card
              key={appointment.id}
              className={`p-5 animate-fade-in${Math.min(i + 1, 6)} bg-card border-border`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{appointment.resident_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Unit {appointment.resident_unit || "Not assigned"}
                  </p>
                  <p className="mt-3 text-sm">
                    {appointment.carrier_name} — {appointment.tracking_code}
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {new Date(appointment.pickup_start).toLocaleString()}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {appointment.package_status && (
                      <StatusBadge status={appointment.package_status as PackageStatus} />
                    )}
                    <HandoffBadge stage={stage} />
                    {hasException(appointment) && <ExceptionBadge />}
                    {appointment.checked_in_at && (
                      <span className="text-xs text-muted-foreground">
                        Checked in {formatTime(appointment.checked_in_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {section === "Today's Pickups" && (
                <div className="mt-4 border-t border-border pt-4">
                  {renderHandoffActions(appointment)}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {!appointmentsLoading && list.length === 0 && !appointmentsError && (
        <Card className="p-6 bg-card border-border">
          <EmptyState icon={CalendarDays} message="No scheduled pickups for this period" />
        </Card>
      )}
    </>
  );
}
