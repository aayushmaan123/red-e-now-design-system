/**
 * Cards for the resident tabs: a package with its plain-language status, a
 * booking with the actions that are actually possible, handoff progress and
 * the pickup receipt.
 */
import type { ReactNode } from "react";
import { CalendarDays, Circle, CircleAlert, CircleCheck, Clock3, LogIn, PackageCheck } from "lucide-react";
import type { PickupAppointment } from "@/api/appointmentsApi";
import type { PackageRecord } from "@/api/packagesApi";
import { Button, Card, formatArrived } from "@/components/common";
import { cn } from "@/lib/utils";
import { StatusLine, touchButton } from "./parts";
import { bookingPhase, type PickupReceipt } from "./pickupState";
import { formatDateTime, formatDay, formatRelativeDay, formatTime, formatTimeRange, formatWhen, wallClockMs } from "./time";
import { PackageRow, ResidentStatus } from "./ui";

/** What a package's status means for the resident, in one sentence. */
export function packageNote(pkg: PackageRecord, appointment: PickupAppointment | undefined, today: string) {
  const window = appointment ? `${formatRelativeDay(appointment.pickup_start, today)}, ${formatTime(appointment.pickup_start)}` : "";
  switch (pkg.status) {
    case "received": return "At the front desk, not released yet. You can book once it is marked available.";
    case "available": return "Ready to book a pickup time.";
    case "scheduled": return window ? `Pickup booked: ${window}.` : "Pickup booked.";
    case "prepared": return window ? `Ready at the front desk for your pickup: ${window}.` : "Ready at the front desk.";
    case "picked_up": return "Picked up.";
  }
}

/** Package row with optional context action. */
export function PackageItem({
  pkg,
  appointment,
  today,
  onBook,
  onOpenPickup,
}: {
  pkg: PackageRecord;
  appointment?: PickupAppointment | undefined;
  today: string;
  onBook?: (() => void) | undefined;
  onOpenPickup?: (() => void) | undefined;
}) {
  const note = packageNote(pkg, appointment, today);
  const action =
    pkg.status === "available" && onBook
      ? { label: "Schedule pickup", onClick: onBook, variant: "primary" as const }
      : (pkg.status === "scheduled" || pkg.status === "prepared") && onOpenPickup
        ? { label: "View pickup details", onClick: onOpenPickup, variant: "secondary" as const }
        : pkg.status === "picked_up" && onOpenPickup
          ? { label: "View receipt", onClick: onOpenPickup, variant: "ghost" as const }
          : undefined;

  return <PackageRow pkg={pkg} note={note} {...(action ? { action } : {})} />;
}

/** Progress through the front-desk handoff after the resident checks in. */
export function HandoffTracker({ appointment }: { appointment: PickupAppointment }) {
  const steps = [
    { label: "Checked in", at: appointment.checked_in_at, done: Boolean(appointment.checked_in_at) },
    { label: "Identity verification", at: appointment.identity_verified_at, done: Boolean(appointment.identity_verified_at) },
    { label: "Sign-off", at: appointment.acknowledged_at, done: Boolean(appointment.acknowledged_at) },
    { label: "Pickup complete", at: appointment.handed_off_at, done: appointment.status === "completed" },
  ];
  return (
    <ol aria-label="Handoff progress">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
          {index < steps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[8.5px] top-5 w-px bg-border" />}
          {step.done
            ? <CircleCheck size={18} strokeWidth={1.8} aria-hidden="true" className="relative mt-px shrink-0 text-success-foreground" />
            : <Circle size={18} strokeWidth={1.8} aria-hidden="true" className="relative mt-px shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <p className={cn("text-sm font-medium leading-5", !step.done && "text-muted-foreground")}>{step.label}</p>
            <p className={cn("text-xs text-muted-foreground", step.done && step.at && "font-mono")}>
              {step.done ? (step.at ? formatDateTime(step.at) : "Done") : "Pending"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * One upcoming booking. The footer offers only what the API will accept:
 * move or cancel until the package is prepared, then check-in.
 */
export function BookingCard({ appointment, now, today, busy, onReschedule, onCancel, checkIn }: {
  appointment: PickupAppointment;
  now: number;
  today: string;
  busy?: boolean;
  onReschedule?: (appointment: PickupAppointment) => void;
  onCancel?: (appointment: PickupAppointment) => void;
  /** Pass to offer the Check in button here; without it the card only says check-in is open. */
  checkIn?: { busyId: number | null; onCheckIn: (id: number) => void };
}) {
  const phase = bookingPhase(appointment, now);
  const opensAt = appointment.check_in_opens_at ?? appointment.pickup_start;
  const day = formatRelativeDay(appointment.pickup_start, today);
  const date = formatDay(appointment.pickup_start);
  const label = `${appointment.carrier_name ?? "package"} ${appointment.tracking_code ?? ""}`.trim();
  const windowPassed = phase === "booked" && now > wallClockMs(appointment.pickup_end);

  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground">
              <CalendarDays size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-[-0.01em]">
                {day}
                {day !== date && <span className="ml-2 text-sm font-normal text-muted-foreground">{date}</span>}
              </p>
              <p className="mt-0.5 font-mono text-[15px] text-foreground">
                {formatTimeRange(appointment.pickup_start, appointment.pickup_end)}
              </p>
            </div>
          </div>
          <ResidentStatus status={appointment.package_status === "prepared" ? "prepared" : "scheduled"} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {appointment.carrier_name}
          {appointment.tracking_code && <> · <span className="break-all font-mono text-[13px] text-foreground/90">{appointment.tracking_code}</span></>}
        </p>
      </div>

      <div className="border-t border-border px-4 py-3">
        {phase === "booked" && <>
          <StatusLine icon={Clock3}>
            {windowPassed
              ? "This pickup window has passed. Reschedule to choose a new time."
              : "The front desk will have your package ready for this window."}
          </StatusLine>
          {(onReschedule || onCancel) && (
            <div className="mt-3 flex gap-2">
              {onReschedule && (
                <Button variant="secondary" className={cn(touchButton, "flex-1")} disabled={busy} aria-label={`Reschedule pickup for ${label}`} onClick={() => onReschedule(appointment)}>
                  Reschedule
                </Button>
              )}
              {onCancel && (
                <Button variant="ghost" className={cn(touchButton, "flex-1")} disabled={busy} aria-label={`Cancel pickup for ${label}`} onClick={() => onCancel(appointment)}>
                  Cancel pickup
                </Button>
              )}
            </div>
          )}
        </>}

        {phase === "ready_early" && (
          <StatusLine icon={PackageCheck} tone="success">
            Your package is ready at the front desk. The next step is check-in, which opens {formatWhen(opensAt, today)}.
          </StatusLine>
        )}

        {phase === "ready_open" && (checkIn ? (
          <>
            <StatusLine icon={PackageCheck} tone="success">
              Your package is ready at the front desk. Check in when you arrive.
            </StatusLine>
            <Button size="lg" fullWidth className="mt-3" disabled={checkIn.busyId !== null} onClick={() => checkIn.onCheckIn(appointment.id)}>
              <LogIn size={18} strokeWidth={1.8} aria-hidden="true" />
              {checkIn.busyId === appointment.id ? "Checking in…" : "Check in"}
            </Button>
          </>
        ) : (
          <StatusLine icon={PackageCheck} tone="success">
            Your package is ready at the front desk. The next step is check-in, which is open now.
          </StatusLine>
        ))}

        {phase === "ready_missed" && (
          <StatusLine icon={CircleAlert}>
            This pickup window has passed. Your package is still at the front desk; ask the staff there for help.
          </StatusLine>
        )}

        {phase === "checked_in" && <HandoffTracker appointment={appointment} />}
      </div>
    </Card>
  );
}

function ReceiptRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

/** Receipt for a completed pickup. */
export function ReceiptCard({ receipt }: { receipt: PickupReceipt }) {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-success-foreground" />
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Package picked up</h3>
      </div>
      <dl className="divide-y divide-border px-4 text-sm">
        <ReceiptRow label="Picked up">
          {receipt.pickedUpAt
            ? <span className="font-mono text-[13px]">{formatDateTime(receipt.pickedUpAt)}</span>
            : <span className="text-muted-foreground">Time not recorded</span>}
        </ReceiptRow>
        <ReceiptRow label="Carrier">{receipt.carrierName}</ReceiptRow>
        <ReceiptRow label="Tracking"><span className="break-all font-mono text-[13px]">{receipt.trackingCode}</span></ReceiptRow>
        {receipt.description && <ReceiptRow label="Contents">{receipt.description}</ReceiptRow>}
        {receipt.checkedInAt && <ReceiptRow label="Check-in"><span className="font-mono text-[13px]">{formatDateTime(receipt.checkedInAt)}</span></ReceiptRow>}
        {receipt.recipientName && <ReceiptRow label="Signed for by">{receipt.recipientName}</ReceiptRow>}
        {receipt.arrivedAt && <ReceiptRow label="Arrived"><span className="font-mono text-[13px]">{formatArrived(receipt.arrivedAt)}</span></ReceiptRow>}
      </dl>
    </Card>
  );
}
