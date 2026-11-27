/**
 * Pickups tab — upcoming bookings (move, cancel, check in, handoff progress)
 * and a receipt for every completed pickup.
 */
import { CalendarDays, History } from "lucide-react";
import type { PickupAppointment } from "@/api/appointmentsApi";
import { Button, Card, EmptyState } from "@/components/common";
import { BookingCard, ReceiptCard } from "./cards";
import { ListError, ListLoading, Notice, PageHeader, RefreshError, SectionHeading, touchButton } from "./parts";
import type { Booking } from "./useBooking";
import type { ResidentData } from "./useResidentData";

export function PickupsTab({ data, booking, onBook, onReschedule }: {
  data: ResidentData;
  booking: Booking;
  onBook: () => void;
  onReschedule: (appointment: PickupAppointment) => void;
}) {
  const { packages, appointments, upcoming, receipts, availablePackages, today } = data;
  const retryAll = () => { void appointments.refresh(); void packages.refresh(); };
  // Receipts are built from both lists; show them once either has real data.
  const receiptsReady = appointments.loaded || packages.loaded;
  const receiptsError = appointments.error || packages.error;

  return (
    <>
      <PageHeader
        title="Pickups"
        description={
          appointments.loaded
            ? `${upcoming.length} upcoming · ${receipts.length} past`
            : "Your bookings, check-in and receipts."
        }
      />

      {booking.feedback && <Notice kind={booking.feedback.kind} className="mb-4">{booking.feedback.message}</Notice>}
      {data.checkInError && <Notice kind="error" className="mb-4">{data.checkInError}</Notice>}

      <div className="space-y-8">
        <section>
          <SectionHeading title="Upcoming" {...(appointments.loaded ? { count: upcoming.length } : {})} />
          {!appointments.loaded ? (
            appointments.error
              ? <ListError title="Could not load your pickups" message={appointments.error} onRetry={() => void appointments.refresh()} busy={appointments.loading} />
              : <ListLoading label="Loading your pickups…" />
          ) : (
            <>
              {appointments.error && <RefreshError message={appointments.error} onRetry={() => void appointments.refresh()} />}
              {upcoming.length === 0 ? (
                <Card className="rounded-2xl">
                  <EmptyState
                    icon={CalendarDays}
                    title="No pickups scheduled"
                    message="Book a time when you have a package ready at the desk."
                    {...(availablePackages.length > 0
                      ? { action: <Button variant="secondary" className={touchButton} onClick={onBook}>Schedule a pickup</Button> }
                      : {})}
                  />
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
                      checkIn={{ busyId: data.checkingInId, onCheckIn: (id) => void data.runCheckIn(id) }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section>
          <SectionHeading title="Past pickups" {...(receiptsReady ? { count: receipts.length } : {})} />
          {!receiptsReady ? (
            receiptsError
              ? <ListError title="Could not load your past pickups" message={receiptsError} onRetry={retryAll} busy={appointments.loading || packages.loading} />
              : <ListLoading label="Loading your past pickups…" />
          ) : (
            <>
              {receiptsError && !appointments.error && <RefreshError message={receiptsError} onRetry={retryAll} />}
              {receipts.length === 0 ? (
                <Card className="rounded-2xl">
                  <EmptyState icon={History} title="No receipts yet" message="Receipts appear here after you collect a package." />
                </Card>
              ) : (
                <div className="space-y-3">
                  {receipts.map((receipt) => <ReceiptCard key={receipt.key} receipt={receipt} />)}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
