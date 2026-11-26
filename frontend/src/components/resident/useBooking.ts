/**
 * useBooking — the pickup form: which package, which day, which slot, plus
 * booking, moving and cancelling. Slots only ever come from the API
 * (`getPickupSlots(date)`); nothing here invents a time.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelAppointment,
  createAppointment,
  rescheduleAppointment,
  type PickupAppointment,
} from "@/api/appointmentsApi";
import { getPickupSlots, type PickupSlot } from "@/api/schedulingApi";
import type { ResidentData } from "./useResidentData";
import { addDays } from "./time";

/** How many days past today the first load looks for a day with open slots. */
const PROBE_DAYS_AHEAD = 7;

export type Feedback = { kind: "success" | "error"; message: string };

const messageOf = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

export function useBooking(data: ResidentData) {
  const { today, clockReady, availablePackages } = data;
  const refreshPackages = data.packages.refresh;
  const refreshAppointments = data.appointments.refresh;

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [chosenPackageId, setChosenPackageId] = useState("");
  const [date, setDate] = useState("");
  // Empty until the resident picks one of the slots the API offers for the date.
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");
  /** Open-slot counts for days already asked about, to mark days with no times. */
  const [openByDay, setOpenByDay] = useState<Record<string, number>>({});
  /** True when the first look found no open slot today or in the days ahead. */
  const [nothingAhead, setNothingAhead] = useState(false);
  const [rescheduling, setRescheduling] = useState<PickupAppointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PickupAppointment | null>(null);

  const latestRequest = useRef(0);
  const dateRef = useRef("");
  const probed = useRef(false);

  const applyDate = (day: string) => {
    dateRef.current = day;
    setDate(day);
  };

  const remember = (day: string, list: PickupSlot[]) =>
    setOpenByDay((known) => ({ ...known, [day]: list.filter((slot) => slot.available).length }));

  /** Load one day's slots. `silent` keeps the current slots on screen while re-reading. */
  const loadSlots = useCallback(async (day: string, options?: { silent?: boolean }) => {
    const request = ++latestRequest.current;
    const silent = options?.silent === true;
    if (!silent) setSlotsLoading(true);
    setSlotsError("");
    try {
      const list = await getPickupSlots(day);
      if (request !== latestRequest.current) return;
      setSlots(list);
      remember(day, list);
    } catch (cause) {
      if (request !== latestRequest.current) return;
      setSlots([]);
      setSlotsError(messageOf(cause, "Could not load available pickup times."));
    } finally {
      if (request === latestRequest.current) setSlotsLoading(false);
    }
  }, []);

  const refreshSlots = useCallback(async () => {
    if (dateRef.current) await loadSlots(dateRef.current, { silent: true });
  }, [loadSlots]);

  /*
   * First load: default to today at the building when it has open slots,
   * otherwise the next day that does. Stops as soon as the resident picks a day.
   */
  useEffect(() => {
    if (!clockReady || probed.current) return;
    probed.current = true;
    if (dateRef.current) return;
    const request = ++latestRequest.current;
    void (async () => {
      setSlotsLoading(true);
      setSlotsError("");
      try {
        for (let offset = 0; offset <= PROBE_DAYS_AHEAD; offset += 1) {
          const day = addDays(today, offset);
          const list = await getPickupSlots(day);
          if (request !== latestRequest.current) return;
          remember(day, list);
          if (list.some((slot) => slot.available)) {
            applyDate(day);
            setSlots(list);
            return;
          }
        }
        applyDate(today);
        setSlots([]);
        setNothingAhead(true);
      } catch (cause) {
        if (request !== latestRequest.current) return;
        applyDate(today);
        setSlots([]);
        setSlotsError(messageOf(cause, "Could not load available pickup times."));
      } finally {
        if (request === latestRequest.current) setSlotsLoading(false);
      }
    })();
  }, [clockReady, today]);

  /** The package the form will book: the resident's choice, or the only available one. */
  const packageId = rescheduling
    ? String(rescheduling.package_id)
    : availablePackages.some((p) => String(p.id) === chosenPackageId)
      ? chosenPackageId
      : availablePackages.length === 1 && availablePackages[0]
        ? String(availablePackages[0].id)
        : "";

  const chooseDate = useCallback((day: string) => {
    if (!day) return;
    if (day < today) {
      setFeedback({ kind: "error", message: "Choose today or a later day." });
      return;
    }
    setFeedback(null);
    setNothingAhead(false);
    applyDate(day);
    // Times differ per date; pick again from that day's open slots.
    setTime("");
    void loadSlots(day);
  }, [today, loadSlots]);

  const chooseTime = useCallback((value: string) => {
    setFeedback(null);
    setTime(value);
  }, []);

  const choosePackage = useCallback((id: string) => {
    setFeedback(null);
    setChosenPackageId(id);
  }, []);

  const submit = async () => {
    setFeedback(null);

    if ((!packageId && rescheduling === null) || !date || !time) {
      setFeedback({ kind: "error", message: "Select a package, date, and time." });
      return;
    }

    const selectedStart = `${date}T${time}`;
    if (!slots.some((slot) => slot.pickup_start === selectedStart && slot.available)) {
      setFeedback({ kind: "error", message: "This time is no longer available. Please select another slot." });
      await refreshSlots();
      return;
    }

    setBusy(true);
    try {
      if (rescheduling !== null) {
        await rescheduleAppointment(rescheduling.id, selectedStart);
        setFeedback({ kind: "success", message: "Pickup rescheduled successfully!" });
        setRescheduling(null);
      } else {
        await createAppointment(Number(packageId), selectedStart);
        setFeedback({ kind: "success", message: "Pickup scheduled successfully!" });
      }
      setChosenPackageId("");
      setTime("");
      await Promise.all([refreshAppointments(), refreshPackages(), refreshSlots()]);
    } catch (cause) {
      setFeedback({ kind: "error", message: messageOf(cause, "Could not schedule pickup.") });
      await refreshSlots();
    } finally {
      setBusy(false);
    }
  };

  /** Start a fresh booking (leaves any move in progress). */
  const beginBooking = useCallback(() => {
    setFeedback(null);
    setRescheduling(null);
  }, []);

  /** Move an existing booking: the form opens on its day with its slot marked. */
  const beginReschedule = useCallback((appointment: PickupAppointment) => {
    setFeedback(null);
    setRescheduling(appointment);
    setNothingAhead(false);
    setTime("");
    const bookedDay = appointment.pickup_start.slice(0, 10);
    const day = bookedDay < today ? today : bookedDay;
    const changed = day !== dateRef.current;
    applyDate(day);
    void loadSlots(day, { silent: !changed });
  }, [today, loadSlots]);

  const stopReschedule = useCallback(() => {
    setRescheduling(null);
    setTime("");
    setFeedback(null);
  }, []);

  const requestCancel = useCallback((appointment: PickupAppointment) => setCancelTarget(appointment), []);
  const dismissCancel = useCallback(() => setCancelTarget(null), []);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const { id } = cancelTarget;
    setFeedback(null);
    setBusy(true);
    try {
      await cancelAppointment(id);
      setFeedback({ kind: "success", message: "Pickup cancelled successfully." });
      if (rescheduling?.id === id) {
        setRescheduling(null);
        setTime("");
      }
      await Promise.all([refreshAppointments(), refreshPackages(), refreshSlots()]);
    } catch (cause) {
      setFeedback({ kind: "error", message: messageOf(cause, "Could not cancel pickup.") });
    } finally {
      setBusy(false);
      setCancelTarget(null);
    }
  };

  const clearFeedback = useCallback(() => setFeedback(null), []);

  return {
    feedback,
    clearFeedback,
    busy,
    packageId,
    choosePackage,
    date,
    chooseDate,
    time,
    chooseTime,
    slots,
    slotsLoading,
    slotsError,
    retrySlots: () => { if (dateRef.current) void loadSlots(dateRef.current); },
    openByDay,
    nothingAhead,
    rescheduling,
    beginBooking,
    beginReschedule,
    stopReschedule,
    submit,
    cancelTarget,
    requestCancel,
    dismissCancel,
    confirmCancel,
  };
}

export type Booking = ReturnType<typeof useBooking>;
