/**
 * Schedule tab — book a pickup or move an existing one: package, day, time,
 * then one confirm button that stays in view while the list of times scrolls.
 */
import type { PickupAppointment } from "@/api/appointmentsApi";
import { Button, Card } from "@/components/common";
import { BookingCard } from "./cards";
import { DayPicker } from "./DayPicker";
import { ListError, ListLoading, Notice, PageHeader, RefreshError, SectionHeading, SelectField, touchButton } from "./parts";
import { SlotPicker } from "./SlotPicker";
import { formatDayLong, formatRelativeDay, formatTimeRange } from "./time";
import type { Booking } from "./useBooking";
import type { ResidentData } from "./useResidentData";

const stepLabel = "font-display text-[15px] font-semibold tracking-[-0.01em] text-foreground";

export function ScheduleTab({ data, booking, onReschedule }: {
  data: ResidentData;
  booking: Booking;
  onReschedule: (appointment: PickupAppointment) => void;
}) {
  const { rescheduling } = booking;
  const { availablePackages, packages, appointments, upcoming, today } = data;
  const selectedSlot = booking.time
    ? booking.slots.find((slot) => slot.pickup_start === `${booking.date}T${booking.time}`)
    : undefined;
  const nothingToBook = rescheduling === null && availablePackages.length === 0;
  const waitingOnDesk = packages.items.some((pkg) => pkg.status === "received");

  return (
    <>
      <PageHeader
        title={rescheduling ? "Reschedule pickup" : "Schedule a pickup"}
        description={rescheduling
          ? `Currently ${formatRelativeDay(rescheduling.pickup_start, today).toLowerCase()}, ${formatTimeRange(rescheduling.pickup_start, rescheduling.pickup_end)}. It stays booked until you confirm a new time.`
          : "Choose a package, a day and an open time at the front desk."}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <form
          noValidate
          onSubmit={(event) => { event.preventDefault(); void booking.submit(); }}
        >
          {packages.error && packages.loaded && <RefreshError message={packages.error} onRetry={() => void packages.refresh()} />}
          <Card>
            <section className="p-4 sm:p-5">
              {rescheduling ? (
                <SelectField label="Package" value={String(rescheduling.package_id)} disabled onChange={() => undefined}>
                  <option value={String(rescheduling.package_id)}>
                    {rescheduling.carrier_name} — {rescheduling.tracking_code}
                  </option>
                </SelectField>
              ) : (
                <SelectField
                  label="Package"
                  value={booking.packageId}
                  disabled={availablePackages.length === 0}
                  onChange={(event) => booking.choosePackage(event.target.value)}
                  {...(nothingToBook && packages.loaded
                    ? { helperText: waitingOnDesk
                      ? "Your package is still being processed at the front desk. You can book once it is marked available."
                      : "When a package is available you can book its pickup here." }
                    : {})}
                >
                  <option value="">
                    {!packages.loaded ? (packages.error ? "Packages could not be loaded" : "Loading packages…") : availablePackages.length === 0 ? "No packages available to book" : "Select a package"}
                  </option>
                  {availablePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.carrier_name} — {pkg.tracking_code}
                    </option>
                  ))}
                </SelectField>
              )}
              {packages.error && !packages.loaded && (
                <Notice kind="error" className="mt-3" action={<Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 text-foreground" onClick={() => void packages.refresh()}>Try again</Button>}>
                  {packages.error}
                </Notice>
              )}
            </section>

            <section className="border-t border-border p-4 sm:p-5">
              <h2 className={stepLabel}>Day</h2>
              <p className="mb-3 mt-0.5 text-sm text-muted-foreground">Today or any later day.</p>
              <DayPicker date={booking.date} today={today} openByDay={booking.openByDay} onChoose={booking.chooseDate} />
            </section>

            <section className="border-t border-border p-4 sm:p-5">
              <h2 className={stepLabel}>Time</h2>
              <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
                {booking.date ? `Open times on ${formatDayLong(booking.date)}.` : "Finding the next day with open times."}
              </p>
              <SlotPicker
                slots={booking.slots}
                loading={booking.slotsLoading}
                error={booking.slotsError}
                onRetry={booking.retrySlots}
                time={booking.time}
                currentStart={rescheduling?.pickup_start}
                nothingAhead={booking.nothingAhead}
                onChoose={booking.chooseTime}
              />
            </section>

            <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-[5] space-y-3 rounded-b-lg border-t border-border bg-card p-4 sm:px-5">
              {booking.feedback && <Notice kind={booking.feedback.kind}>{booking.feedback.message}</Notice>}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedSlot ? (
                    <>
                      {rescheduling ? "Move to " : "Pickup "}
                      <span className="font-mono text-[13px] text-foreground">
                        {formatRelativeDay(selectedSlot.pickup_start, today)}, {formatTimeRange(selectedSlot.pickup_start, selectedSlot.pickup_end)}
                      </span>
                    </>
                  ) : nothingToBook && packages.loaded
                    ? "You have no available packages to schedule."
                    : rescheduling ? "Choose a new time to continue." : "Choose a time to continue."}
                </p>
                <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                  {rescheduling && (
                    <Button type="button" variant="secondary" className={touchButton} onClick={booking.stopReschedule} disabled={booking.busy}>
                      Keep current time
                    </Button>
                  )}
                  <Button type="submit" className={touchButton} disabled={booking.busy || nothingToBook}>
                    {booking.busy ? "Saving…" : rescheduling ? "Confirm reschedule" : "Confirm pickup"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </form>

        <section aria-label="Your scheduled pickups">
          <SectionHeading title="Your scheduled pickups" {...(appointments.loaded ? { count: upcoming.length } : {})} />
          {!appointments.loaded ? (
            appointments.error
              ? <ListError title="Could not load your pickups" message={appointments.error} onRetry={() => void appointments.refresh()} busy={appointments.loading} />
              : <ListLoading label="Loading your pickups…" />
          ) : (
            <>
              {appointments.error && <RefreshError message={appointments.error} onRetry={() => void appointments.refresh()} />}
              {upcoming.length === 0 ? (
                <Card className="px-4 py-5">
                  <p className="text-sm text-muted-foreground">No pickups scheduled yet.</p>
                </Card>
              ) : (
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
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
