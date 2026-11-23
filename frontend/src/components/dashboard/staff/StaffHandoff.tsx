/**
 * StaffHandoff — the handoff desk view.
 * Shows checked-in residents with their current handoff stage,
 * storage location, and the next handoff action.
 */
import { Handshake, MapPin } from "lucide-react";
import { Avatar, Button, Card, EmptyState, StatusBadge } from "@/components/common";
import { useStaff } from "./StaffContext";
import { handoffStage, formatTime, toReceipt } from "./StaffTypes";
import { HandoffBadge, ExceptionBadge } from "./StaffBadges";
import { ReceiptCard } from "./StaffReceiptCard";

export function StaffHandoff() {
  const {
    checkedInAppointments, appointmentsLoading, handoffError,
    lastReceipt, setLastReceipt, completedToday,
    renderHandoffActions, hasException, completionInfo, choose,
  } = useStaff();

  return (
    <>
      <div className="mb-7 animate-fade-in">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Oakwood Residences / Management
        </p>
        <h1 className="font-display text-[38px] font-semibold uppercase leading-none">
          Handoff
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {checkedInAppointments.length} resident{checkedInAppointments.length !== 1 ? "s" : ""} waiting at the desk.
        </p>
      </div>

      {handoffError && (
        <p role="alert" className="mb-4 text-sm text-destructive">{handoffError}</p>
      )}

      {/* Last receipt */}
      {lastReceipt && (
        <section className="mb-8 max-w-xl" aria-live="polite">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[23px] font-semibold uppercase text-success">
              Pickup Confirmed
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setLastReceipt(null)}>
              Dismiss
            </Button>
          </div>
          <ReceiptCard receipt={lastReceipt} highlight />
        </section>
      )}

      {/* Checked-in residents grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {checkedInAppointments.map((appointment, i) => (
          <Card
            key={appointment.id}
            className={`p-5 animate-fade-in${Math.min(i + 1, 6)} bg-card border-border`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={appointment.resident_name || "Resident"} />
                <div>
                  <p className="font-medium">{appointment.resident_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Unit {appointment.resident_unit || "Not assigned"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <HandoffBadge stage={handoffStage(appointment)} />
                {hasException(appointment) && <ExceptionBadge />}
                {appointment.checked_in_at && (
                  <span className="text-xs text-muted-foreground">
                    Arrived {formatTime(appointment.checked_in_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Storage location */}
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-prepared/10 px-4 py-3 text-prepared">
              <MapPin size={20} strokeWidth={1.8} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider opacity-80">Storage location</p>
                <p className="font-display text-xl font-semibold uppercase leading-tight">
                  {appointment.location_code || "Unassigned"}
                </p>
              </div>
            </div>

            {/* Details */}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Carrier</dt>
                <dd className="mt-1">{appointment.carrier_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tracking</dt>
                <dd className="mt-1 break-all font-mono text-xs">{appointment.tracking_code}</dd>
              </div>
            </dl>

            {appointment.recipient_name && (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Signed for by</span>{" "}
                <span className="font-medium">{appointment.recipient_name}</span>
              </p>
            )}

            {/* Actions */}
            <div className="mt-5 border-t border-border pt-4">
              {renderHandoffActions(appointment)}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {checkedInAppointments.length === 0 && !appointmentsLoading && (
        <Card className="animate-fade-in bg-card border-border">
          <EmptyState
            icon={Handshake}
            message="No residents checked in yet. Residents check in from their app when they arrive."
            action={
              <Button variant="secondary" onClick={() => choose("Today's Pickups")}>
                Open Today's Pickups
              </Button>
            }
          />
        </Card>
      )}

      {/* Completed today */}
      {completedToday.length > 0 && (
        <section className="mt-10 animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[23px] font-semibold uppercase">Completed Today</h2>
            <Button variant="ghost" size="sm" onClick={() => choose("History")}>View all</Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {completedToday.slice(0, 4).map((a) => (
              <ReceiptCard
                key={a.id}
                receipt={toReceipt(a, completionInfo[a.id]?.at ?? null, completionInfo[a.id]?.by ?? null)}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
