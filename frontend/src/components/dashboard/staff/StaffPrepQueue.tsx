/**
 * StaffPrepQueue — preparation queue sorted by soonest pickup.
 * Shows storage location prominently, urgency badges, mark-prepared action.
 */
import { Archive, MapPin, Timer } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/common";
import { BuildingName, useStaff } from "./StaffContext";
import { pickupUrgency, formatTime } from "./StaffTypes";

export function StaffPrepQueue() {
  const {
    prepQueue, appointmentsError, appointmentsLoading,
    prepBusyId, handlePrepare, now,
  } = useStaff();

  return (
    <>
      <div className="mb-7 animate-fade-in">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <BuildingName /> / Management
        </p>
        <h1 className="font-display text-[38px] font-semibold leading-none">
          Preparation Queue
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {prepQueue.length} package{prepQueue.length !== 1 ? "s" : ""} to pull — soonest pickup first.
        </p>
      </div>

      {appointmentsError && (
        <p role="alert" className="mb-4 text-sm text-destructive">{appointmentsError}</p>
      )}

      <div className="space-y-3">
        {prepQueue.map((appointment, i) => {
          const urgency = pickupUrgency(appointment, now);
          return (
            <Card
              key={appointment.id}
              className={`p-5 animate-fade-in${Math.min(i + 1, 6)} bg-card border-border`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Storage location */}
                <div className="flex shrink-0 items-center gap-3 rounded-lg bg-prepared/10 px-4 py-3 text-prepared sm:w-44">
                  <MapPin size={20} strokeWidth={1.8} />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider opacity-80">Location</p>
                    <p className="truncate font-display text-xl font-semibold leading-tight">
                      {appointment.location_code || "Unassigned"}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${urgency.tone}`}>
                      <Timer size={12} strokeWidth={2} />
                      {urgency.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(appointment.pickup_start)}–{formatTime(appointment.pickup_end)}
                    </span>
                  </div>
                  <p className="mt-2 font-medium">
                    {appointment.resident_name}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      · Unit {appointment.resident_unit || "Not assigned"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {appointment.carrier_name} · <span className="font-mono text-xs">{appointment.tracking_code}</span>
                  </p>
                </div>

                <Button
                  onClick={() => handlePrepare(appointment)}
                  disabled={prepBusyId === appointment.id}
                  className="sm:shrink-0"
                >
                  {prepBusyId === appointment.id ? "Saving…" : "Mark Prepared"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {prepQueue.length === 0 && !appointmentsLoading && (
        <Card className="animate-fade-in bg-card border-border">
          <EmptyState icon={Archive} message="No packages currently awaiting preparation." />
        </Card>
      )}
    </>
  );
}
