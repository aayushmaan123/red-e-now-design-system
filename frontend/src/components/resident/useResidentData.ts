/**
 * useResidentData — everything the resident app reads from the API:
 * the resident's own packages, their appointments, the building clock and
 * check-in. Each list tracks loading, loaded and error so every view can show
 * a loading, empty and error state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAppointments, type PickupAppointment } from "@/api/appointmentsApi";
import { checkIn } from "@/api/handoffApi";
import { getMyPackages, type PackageRecord } from "@/api/packagesApi";
import { getSchedulingSettings, type SchedulingSettings } from "@/api/schedulingApi";
import { bookingPhase, buildReceipts, nextStep } from "./pickupState";
import { isoDay, parseWallClock } from "./time";

export interface Resource<T> {
  items: T[];
  /** At least one load has succeeded, so `items` is real data. */
  loaded: boolean;
  loading: boolean;
  /** Message from the last failed load ("" when the last load worked). */
  error: string;
  /** `silent` keeps the current view as is: no loading state, no error on failure. */
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

function useResource<T>(fetcher: () => Promise<T[]>, fallbackMessage: string): Resource<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latest = useRef(0);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const request = ++latest.current;
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      const list = await fetcher();
      if (request !== latest.current) return;
      setItems(list);
      setLoaded(true);
      setError("");
    } catch (cause) {
      if (request !== latest.current || silent) return;
      setError(cause instanceof Error ? cause.message : fallbackMessage);
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [fetcher, fallbackMessage]);

  return { items, loaded, loading, error, refresh };
}

/** How often to re-read appointments while the desk is completing a handoff. */
const HANDOFF_POLL_MS = 15_000;

export function useResidentData() {
  const packages = useResource<PackageRecord>(getMyPackages, "Could not load your packages.");
  const appointments = useResource<PickupAppointment>(getAppointments, "Could not load your pickups.");
  const refreshPackages = packages.refresh;
  const refreshAppointments = appointments.refresh;

  useEffect(() => { void refreshPackages(); }, [refreshPackages]);
  useEffect(() => { void refreshAppointments(); }, [refreshAppointments]);

  /*
   * Building clock. Pickup times are the building's wall-clock time, so "now"
   * and "today" come from the building too: `building_now` from the settings
   * endpoint, kept ticking with the device clock. If settings cannot be read
   * the device clock is used as is.
   */
  const [settings, setSettings] = useState<SchedulingSettings | null>(null);
  const [clockReady, setClockReady] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [deviceNow, setDeviceNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    getSchedulingSettings()
      .then((loadedSettings) => {
        if (cancelled) return;
        setSettings(loadedSettings);
        const buildingNow = parseWallClock(loadedSettings.building_now);
        if (buildingNow) {
          const device = Date.now();
          setClockOffset(buildingNow.getTime() - device);
          setDeviceNow(device);
        }
      })
      .catch(() => { /* device clock stays in use */ })
      .finally(() => { if (!cancelled) setClockReady(true); });
    return () => { cancelled = true; };
  }, []);

  // Re-evaluate pickup windows as time passes.
  useEffect(() => {
    const id = window.setInterval(() => setDeviceNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const now = deviceNow + clockOffset;
  const today = isoDay(new Date(now));

  /* Derived lists */
  const activePackages = useMemo(() => packages.items.filter((p) => p.status !== "picked_up"), [packages.items]);
  const availablePackages = useMemo(() => packages.items.filter((p) => p.status === "available"), [packages.items]);
  const upcoming = useMemo(() => appointments.items.filter((a) => a.status === "scheduled"), [appointments.items]);
  const receipts = useMemo(() => buildReceipts(packages.items, appointments.items), [packages.items, appointments.items]);
  const step = useMemo(() => nextStep(packages.items, upcoming, now), [packages.items, upcoming, now]);

  /* Check-in */
  const [checkingInId, setCheckingInId] = useState<number | null>(null);
  const [checkInError, setCheckInError] = useState("");

  const runCheckIn = useCallback(async (id: number) => {
    setCheckInError("");
    setCheckingInId(id);
    try {
      await checkIn(id);
      await refreshAppointments();
    } catch (cause) {
      setCheckInError(cause instanceof Error ? cause.message : "Could not check in.");
    } finally {
      setCheckingInId(null);
    }
  }, [refreshAppointments]);

  const clearCheckInError = useCallback(() => setCheckInError(""), []);

  /*
   * After check-in the desk verifies identity, records the sign-off and
   * completes the pickup. Re-read quietly while that is in progress so the
   * progress list and the receipt appear without a manual refresh.
   */
  const handoffInProgress = upcoming.some((a) => bookingPhase(a, now) === "checked_in");
  useEffect(() => {
    if (!handoffInProgress) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshAppointments({ silent: true });
      void refreshPackages({ silent: true });
    }, HANDOFF_POLL_MS);
    return () => window.clearInterval(id);
  }, [handoffInProgress, refreshAppointments, refreshPackages]);

  return {
    packages,
    appointments,
    settings,
    clockReady,
    now,
    today,
    activePackages,
    availablePackages,
    upcoming,
    receipts,
    step,
    checkingInId,
    checkInError,
    runCheckIn,
    clearCheckInError,
  };
}

export type ResidentData = ReturnType<typeof useResidentData>;
