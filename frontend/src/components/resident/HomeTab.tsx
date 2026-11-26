/**
 * Home tab — leads with the one thing the resident should do next, then a
 * short summary, their upcoming pickups and the packages at the front desk.
 */
import type { ReactNode } from "react";
import { ArrowRight, LogIn, Package } from "lucide-react";
import type { PickupAppointment } from "@/api/appointmentsApi";
import { Button, Card, EmptyState, labelClass } from "@/components/common";
import { BookingCard, PackageItem } from "./cards";
import { ListError, ListLoading, Notice, PageHeader, RefreshError, SectionHeading, touchButton } from "./parts";
import type { NextStep } from "./pickupState";
import { formatRelativeDay, formatTimeRange, formatWhen } from "./time";
import type { Booking } from "./useBooking";
import type { ResidentData } from "./useResidentData";

const HOME_PACKAGE_LIMIT = 3;

/** Carrier, tracking code and pickup window of a booking, in two quiet lines. */
function BookingFacts({ appointment, today }: { appointment: PickupAppointment; today: string }) {
  return (
    <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
      <p className="font-mono text-[15px] text-foreground">
        {formatRelativeDay(appointment.pickup_start, today)}, {formatTimeRange(appointment.pickup_start, appointment.pickup_end)}
      </p>
      <p className="text-muted-foreground">
        {appointment.carrier_name}
        {appointment.tracking_code && <> · <span className="break-all font-mono text-[13px] text-foreground/90">{appointment.tracking_code}</span></>}
      </p>
    </div>
  );
}

function StepCard({ eyebrow, title, children, facts, action }: { eyebrow: string; title: string; children: ReactNode; facts?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className={labelClass}>{eyebrow}</p>
      <h2 className="mt-2 font-display text-[19px] font-semibold leading-snug tracking-[-0.015em] text-foreground">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
      {facts}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

/** The single lead card on Home. At most one primary button. */
function NextStepCard({ step, data, onBook, onOpenPickups }: {
  step: NextStep;
  data: ResidentData;
  onBook: () => void;
  onOpenPickups: () => void;
}) {
  const { today } = data;
  switch (step.kind) {
    case "check_in":
      return (
        <StepCard
          eyebrow="Next step"
          title="Check in at the front desk"
          facts={<BookingFacts appointment={step.appointment} today={today} />}
          action={<>
            {data.checkInError && <Notice kind="error" className="mb-3">{data.checkInError}</Notice>}
            <Button size="lg" fullWidth className="sm:w-auto" disabled={data.checkingInId !== null} onClick={() => void data.runCheckIn(step.appointment.id)}>
              <LogIn size={18} strokeWidth={1.8} aria-hidden="true" />
              {data.checkingInId === step.appointment.id ? "Checking in…" : "Check in"}
            </Button>
          </>}
        >
          Your package is ready. Check in when you arrive and the staff will hand it over.
        </StepCard>
      );
    case "checked_in":
      return (
        <StepCard
          eyebrow="In progress"
          title="You're checked in"
          facts={<BookingFacts appointment={step.appointment} today={today} />}
          action={<Button variant="secondary" className={touchButton} onClick={onOpenPickups}>View progress <ArrowRight size={16} aria-hidden="true" /></Button>}
        >
          The front desk is confirming your identity and handing over your package.
        </StepCard>
      );
    case "book": {
      const only = step.packages.length === 1 ? step.packages[0] : undefined;
      return (
        <StepCard
          eyebrow="Next step"
          title={only ? "Your package is ready to book" : `${step.packages.length} packages are ready to book`}
          facts={only && (
            <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
              {only.carrier_name} · <span className="break-all font-mono text-[13px] text-foreground/90">{only.tracking_code}</span>
            </p>
          )}
          action={<Button size="lg" fullWidth className="sm:w-auto" onClick={onBook}>Book a pickup <ArrowRight size={17} aria-hidden="true" /></Button>}
        >
          Choose a time that suits you and the front desk will have it ready when you arrive.
        </StepCard>
      );
    }
    case "ready_early":
      return (
        <StepCard eyebrow="Nothing to do right now" title="Your package is ready at the front desk" facts={<BookingFacts appointment={step.appointment} today={today} />}>
          The next step is check-in, which opens {formatWhen(step.appointment.check_in_opens_at ?? step.appointment.pickup_start, today)}.
        </StepCard>
      );
    case "ready_missed":
      return (
        <StepCard eyebrow="Needs attention" title="Your pickup window has passed" facts={<BookingFacts appointment={step.appointment} today={today} />}>
          Your package is still at the front desk. Ask the staff there for help.
        </StepCard>
      );
    case "booked":
      return (
        <StepCard eyebrow="Nothing to do right now" title="Your pickup is booked" facts={<BookingFacts appointment={step.appointment} today={today} />}>
          The front desk will have your package ready for this window.
        </StepCard>
      );
    case "received":
      return (
        <StepCard eyebrow="Nothing to do right now" title={step.packages.length === 1 ? "Your package is at the front desk" : `${step.packages.length} packages are at the front desk`}>
          The staff have not released {step.packages.length === 1 ? "it" : "them"} yet. You can book a pickup as soon as {step.packages.length === 1 ? "it is" : "they are"} marked available.
        </StepCard>
      );
    case "none":
      return (
        <Card>
          <EmptyState icon={Package} message="No packages waiting for you right now" />
        </Card>
      );
  }
}

export function HomeTab({ data, booking, firstName, onBook, onReschedule, onOpenPackages, onOpenPickups }: {
  data: ResidentData;
  booking: Booking;
  firstName: string;
  onBook: () => void;
  onReschedule: (appointment: PickupAppointment) => void;
  onOpenPackages: () => void;
  onOpenPickups: () => void;
}) {
  const { packages, appointments, activePackages, upcoming, receipts, step, today } = data;
  const byPackage = new Map(upcoming.map((appointment) => [appointment.package_id, appointment]));
  // Hold the lead card until both lists have answered, so it does not change under the reader.
  const settled = packages.loaded && (appointments.loaded || !appointments.loading);
  const summary = [
    { label: "At the desk", value: activePackages.length },
    { label: "Booked", value: upcoming.length },
    { label: "Picked up", value: receipts.length },
  ];
  const showSummary = settled && summary.some((entry) => entry.value > 0);
  const showAside = showSummary || upcoming.length > 0 || Boolean(appointments.error);

  return (
    <>
      <PageHeader
        title={<>Welcome back, {firstName}</>}
        description={data.settings?.building_name ? `Your packages at ${data.settings.building_name}.` : "Your packages at the front desk."}
      />

      {booking.feedback && <Notice kind={booking.feedback.kind} className="mb-4">{booking.feedback.message}</Notice>}

      <div className={showAside ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start" : "max-w-2xl"}>
        <section aria-label="Next step">
          {!packages.loaded ? (
            packages.error
              ? <ListError title="Could not load your packages" message={packages.error} onRetry={() => void packages.refresh()} busy={packages.loading} />
              : <ListLoading label="Loading your packages…" />
          ) : !settled ? (
            <ListLoading label="Loading your pickups…" />
          ) : (
            <>
              {packages.error && <RefreshError message={packages.error} onRetry={() => void packages.refresh()} />}
              <NextStepCard step={step} data={data} onBook={onBook} onOpenPickups={onOpenPickups} />
            </>
          )}
        </section>

        {showAside && (
          <aside className="space-y-8 lg:row-span-2">
            {showSummary && (
              <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-card">
                {summary.map((entry) => (
                  <div key={entry.label} className="px-4 py-3">
                    <dt className="text-xs text-muted-foreground">{entry.label}</dt>
                    <dd className="mt-1 font-display text-2xl font-semibold leading-none tracking-[-0.02em] tabular-nums">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {(upcoming.length > 0 || appointments.error) && (
              <section>
                <SectionHeading title="Upcoming pickups" {...(appointments.loaded ? { count: upcoming.length } : {})} />
                {appointments.error && (
                  appointments.loaded
                    ? <RefreshError message={appointments.error} onRetry={() => void appointments.refresh()} />
                    : <ListError title="Could not load your pickups" message={appointments.error} onRetry={() => void appointments.refresh()} busy={appointments.loading} />
                )}
                <div className="space-y-3">
                  {upcoming.map((appointment) => (
                    <BookingCard
                      key={appointment.id}
                      appointment={appointment}
                      now={data.now}
                      today={today}
                      busy={booking.busy}
                      onReschedule={onReschedule}
                      onCancel={booking.requestCancel}
                    />
                  ))}
                </div>
              </section>
            )}
          </aside>
        )}

        {activePackages.length > 0 && (
          <section>
            <SectionHeading title="Your packages" count={activePackages.length} />
            <div className="space-y-3">
              {activePackages.slice(0, HOME_PACKAGE_LIMIT).map((pkg) => (
                <PackageItem key={pkg.id} pkg={pkg} appointment={byPackage.get(pkg.id)} today={today} />
              ))}
            </div>
            {activePackages.length > HOME_PACKAGE_LIMIT && (
              <Button variant="ghost" fullWidth className={`mt-2 ${touchButton}`} onClick={onOpenPackages}>
                View all {activePackages.length} packages <ArrowRight size={15} aria-hidden="true" />
              </Button>
            )}
          </section>
        )}
      </div>
    </>
  );
}
