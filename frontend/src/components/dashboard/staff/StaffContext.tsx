/**
 * StaffContext — shared state for every staff dashboard sub-component.
 *
 * All state that was previously in the StaffDashboard monolith now lives here
 * so each focused component can consume only what it needs through the hook.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  getPackages,
  registerPackage,
  updatePackage,
  getPackageAudit,
  type PackageAuditEntry,
  type PackageRecord,
  type PackageStatus,
} from "@/api/packagesApi";
import { getResidents, type ResidentOption } from "@/api/residentsApi";
import { getAppointments, type PickupAppointment } from "@/api/appointmentsApi";
import {
  completeHandoff,
  signoff,
  verifyIdentity,
  type HandoffResponse,
} from "@/api/handoffApi";
import {
  getSchedulingSettings,
  updateSchedulingSettings,
  type SchedulingSettings,
} from "@/api/schedulingApi";
import {
  type HandoffStage,
  handoffStage,
  isFlagged,
  toReceipt,
  type HandoffReceipt,
} from "./StaffTypes";

/* ────────────────────────────────────────────── */
/*  Context shape                                 */
/* ────────────────────────────────────────────── */

export interface StaffState {
  /* Auth / nav */
  user: ReturnType<typeof useAuth>["user"];
  signOut: () => void;
  navigate: ReturnType<typeof useNavigate>;
  toggle: () => void;
  isDark: boolean;

  /* Section routing */
  section: string;
  setSection: (s: string) => void;
  menu: boolean;
  setMenu: (v: boolean) => void;
  choose: (label: string) => void;
  date: string;

  /* Package list */
  packages: PackageRecord[];
  loading: boolean;
  searchQ: string;
  setSearchQ: (v: string) => void;
  statusFilter: PackageStatus | "";
  setStatusFilter: (v: PackageStatus | "") => void;
  sortKey: string | undefined;
  sortDir: "asc" | "desc";
  sortedPackages: PackageRecord[];
  handleSort: (key: string) => void;
  fetchPackages: () => Promise<void>;

  /* Drawer */
  drawerPkg: PackageRecord | null;
  setDrawerPkg: (v: PackageRecord | null) => void;
  audit: PackageAuditEntry[];
  auditError: string;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  editCarrier: string;
  setEditCarrier: (v: string) => void;
  editTracking: string;
  setEditTracking: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editLocation: string;
  setEditLocation: (v: string) => void;
  editSaving: boolean;
  editError: string;
  setEditError: (v: string) => void;
  editSuccess: string;
  setEditSuccess: (v: string) => void;
  handleEditSave: (e: React.FormEvent) => Promise<void>;
  handleStatusAdvance: (pkg: PackageRecord) => Promise<void>;

  /* Register form */
  regCarrier: string;
  setRegCarrier: (v: string) => void;
  regTracking: string;
  setRegTracking: (v: string) => void;
  residents: ResidentOption[];
  residentsError: string;
  regResidentId: string;
  setRegResidentId: (v: string) => void;
  regLocation: string;
  setRegLocation: (v: string) => void;
  regDescription: string;
  setRegDescription: (v: string) => void;
  regLoading: boolean;
  regSuccess: boolean;
  regError: string;
  handleRegister: (e: React.FormEvent) => Promise<void>;

  /* Appointments */
  appointments: PickupAppointment[];
  appointmentsLoading: boolean;
  appointmentsError: string;
  fetchAppointments: () => Promise<void>;
  activeAppointments: PickupAppointment[];
  todaysAppointments: PickupAppointment[];
  todaysPickups: PickupAppointment[];
  prepQueue: PickupAppointment[];
  checkedInAppointments: PickupAppointment[];
  completedToday: PickupAppointment[];
  now: number;
  todayKey: string;

  /* Scheduling settings */
  schedulingSettings: SchedulingSettings | null;
  /** Building name from the API; empty until settings have loaded. */
  buildingName: string;
  setSchedulingSettings: (v: SchedulingSettings | null) => void;
  settingsBusy: boolean;
  settingsMessage: string;
  saveSchedulingSettings: () => Promise<void>;

  /* Handoff */
  handoffTarget: PickupAppointment | null;
  setHandoffTarget: (v: PickupAppointment | null) => void;
  handoffBusyId: number | null;
  handoffError: string;
  signoffId: number | null;
  setSignoffId: (v: number | null) => void;
  signoffName: string;
  setSignoffName: (v: string) => void;
  signoffAck: boolean;
  setSignoffAck: (v: boolean) => void;
  signoffNote: string;
  setSignoffNote: (v: string) => void;
  lastReceipt: HandoffReceipt | null;
  setLastReceipt: (v: HandoffReceipt | null) => void;
  prepBusyId: number | null;
  completionInfo: Record<number, { at: string; by: string }>;
  hasException: (a: PickupAppointment) => boolean;

  /* Handoff actions */
  handlePrepare: (a: PickupAppointment) => Promise<void>;
  handleVerifyIdentity: (a: PickupAppointment) => Promise<HandoffResponse | null>;
  openSignoff: (a: PickupAppointment) => void;
  handleSignoff: (e: React.FormEvent, a: PickupAppointment) => Promise<void>;
  handleCompleteHandoff: () => Promise<void>;
  renderHandoffActions: (a: PickupAppointment) => React.ReactNode;

  /* Logout */
  logout: () => void;
}

const Ctx = createContext<StaffState | null>(null);

export function useStaff(): StaffState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStaff must be used inside <StaffProvider>");
  return ctx;
}

/**
 * The building's name as stored in the `buildings` table
 * (delivered with GET /api/scheduling/settings). Renders a quiet
 * placeholder for the moment before settings load.
 */
export function BuildingName() {
  const { buildingName } = useStaff();
  return <>{buildingName || "Building"}</>;
}

/* ────────────────────────────────────────────── */
/*  Shared constants                              */
/* ────────────────────────────────────────────── */

export const CARRIERS = [
  "FedEx", "UPS", "USPS", "Amazon", "DHL", "OnTrac", "LaserShip", "Other",
];

export const STATUS_OPTIONS: { value: PackageStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "received", label: "Received" },
  { value: "available", label: "Available" },
  { value: "scheduled", label: "Scheduled" },
  { value: "prepared", label: "Prepared" },
  { value: "picked_up", label: "Picked up" },
];

export const NEXT_STATUS: Record<string, { next: string; label: string } | undefined> = {
  received: { next: "available", label: "Mark Available for Pickup" },
  scheduled: { next: "prepared", label: "Mark Prepared" },
};

/* ────────────────────────────────────────────── */
/*  Provider                                      */
/* ────────────────────────────────────────────── */

export function StaffProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();

  const [section, setSection] = useState("Dashboard");
  const [menu, setMenu] = useState(false);
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  /* ── Package list state ── */
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<PackageStatus | "">("");
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  /* ── Drawer state ── */
  const [drawerPkg, setDrawerPkg] = useState<PackageRecord | null>(null);
  const [audit, setAudit] = useState<PackageAuditEntry[]>([]);
  const [auditError, setAuditError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editCarrier, setEditCarrier] = useState("");
  const [editTracking, setEditTracking] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  /* ── Register form ── */
  const [regCarrier, setRegCarrier] = useState<string>("FedEx");
  const [regTracking, setRegTracking] = useState("");
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [residentsError, setResidentsError] = useState("");
  const [regResidentId, setRegResidentId] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regDescription, setRegDescription] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState("");

  /* ── Appointments ── */
  const [appointments, setAppointments] = useState<PickupAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState("");

  const fetchAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    setAppointmentsError("");
    try {
      setAppointments(await getAppointments());
    } catch (error) {
      setAppointmentsError(
        error instanceof Error ? error.message : "Could not load appointments."
      );
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments, section]);

  /* ── Scheduling settings ── */
  const [schedulingSettings, setSchedulingSettings] =
    useState<SchedulingSettings | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    getSchedulingSettings()
      .then(setSchedulingSettings)
      .catch((error: unknown) => {
        setSettingsMessage(
          error instanceof Error
            ? error.message
            : "Could not load scheduling settings."
        );
      });
  }, []);

  const saveSchedulingSettings = async () => {
    if (!schedulingSettings) return;
    setSettingsBusy(true);
    setSettingsMessage("");
    try {
      await updateSchedulingSettings({
        open_time: schedulingSettings.open_time,
        close_time: schedulingSettings.close_time,
        slot_minutes: schedulingSettings.slot_minutes,
        default_capacity: schedulingSettings.default_capacity,
        cancellation_cutoff_minutes: schedulingSettings.cancellation_cutoff_minutes,
      });
      setSettingsMessage("Scheduling settings saved.");
      await fetchAppointments();
    } catch (error) {
      setSettingsMessage(
        error instanceof Error ? error.message : "Could not save scheduling settings."
      );
    } finally {
      setSettingsBusy(false);
    }
  };

  /* ── Handoff ── */
  const [handoffTarget, setHandoffTarget] = useState<PickupAppointment | null>(null);
  const [handoffBusyId, setHandoffBusyId] = useState<number | null>(null);
  const [handoffError, setHandoffError] = useState("");
  const [signoffId, setSignoffId] = useState<number | null>(null);
  const [signoffName, setSignoffName] = useState("");
  const [signoffAck, setSignoffAck] = useState(false);
  const [signoffNote, setSignoffNote] = useState("");
  const [lastReceipt, setLastReceipt] = useState<HandoffReceipt | null>(null);
  const [prepBusyId, setPrepBusyId] = useState<number | null>(null);
  const [completionInfo, setCompletionInfo] =
    useState<Record<number, { at: string; by: string }>>({});

  /* ── Computed values ── */
  const todayKey = new Date().toLocaleDateString("en-CA");
  const now = Date.now();

  const activeAppointments = appointments.filter(
    (a) => a.status === "scheduled"
  );

  const todaysAppointments = activeAppointments.filter(
    (a) => a.pickup_start.slice(0, 10) === todayKey
  );

  const byPickupTime = (a: PickupAppointment, b: PickupAppointment) =>
    new Date(a.pickup_start).getTime() - new Date(b.pickup_start).getTime();

  const prepQueue = activeAppointments
    .filter((a) => a.package_status === "scheduled")
    .sort(byPickupTime);

  const checkedInAppointments = activeAppointments
    .filter((a) => a.package_status === "prepared" && handoffStage(a) !== "Not checked in")
    .sort((a, b) =>
      new Date(a.checked_in_at ?? a.pickup_start).getTime() -
      new Date(b.checked_in_at ?? b.pickup_start).getTime()
    );

  const todaysPickups = appointments
    .filter(
      (a) =>
        (a.status === "scheduled" || a.status === "completed") &&
        a.pickup_start.slice(0, 10) === todayKey
    )
    .sort(byPickupTime);

  const packageExceptions = new Set(
    packages.filter((p) => isFlagged(p.has_exception)).map((p) => p.id)
  );

  const hasException = (appointment: PickupAppointment) =>
    isFlagged(appointment.has_exception) || packageExceptions.has(appointment.package_id);

  const completedToday = appointments
    .filter((a) => a.status === "completed")
    .filter((a) => {
      const at = completionInfo[a.id]?.at ?? a.handed_off_at;
      return at
        ? new Date(at).toLocaleDateString("en-CA") === todayKey
        : a.pickup_start.slice(0, 10) === todayKey;
    })
    .sort((a, b) =>
      (completionInfo[b.id]?.at ?? b.pickup_start).localeCompare(
        completionInfo[a.id]?.at ?? a.pickup_start
      )
    );

  const sortedPackages = [...packages].sort((a, b) => {
    if (!sortKey) return 0;
    const key = sortKey as keyof PackageRecord;
    const aVal = String(a[key] ?? "");
    const bVal = String(b[key] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });

  /* ── Completion info lookup ── */
  useEffect(() => {
    if (!["Handoff", "History", "Dashboard"].includes(section)) return;
    const missing = appointments.filter(
      (a) =>
        a.status === "completed" &&
        a.pickup_start.slice(0, 10) === todayKey &&
        !completionInfo[a.id]
    );
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (a) => {
        const auditEntries = await getPackageAudit(a.package_id).catch(() => []);
        const entry = auditEntries.find((e) => e.new_values?.["status"] === "picked_up");
        return entry
          ? ([a.id, { at: entry.changed_at, by: entry.changed_by_name }] as const)
          : null;
      })
    ).then((results) => {
      if (cancelled) return;
      const found = results.filter((r) => r !== null);
      if (found.length === 0) return;
      setCompletionInfo((current) => ({ ...current, ...Object.fromEntries(found) }));
    });
    return () => { cancelled = true; };
  }, [section, appointments]);

  /* ── Handlers ── */
  const choose = (label: string) => { setMenu(false); setSection(label); };

  const logout = () => {
    signOut();
    navigate({ to: "/staff/login", replace: true });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  /* ── Fetch packages ── */
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPackages({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(searchQ.trim() ? { search: searchQ.trim() } : {}),
      });
      setPackages(list);
    } catch {
      // silently fail — empty state shown
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQ]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  /* ── Resident loading ── */
  useEffect(() => {
    getResidents()
      .then((list) => {
        setResidents(list);
        setRegResidentId((current) => current || String(list[0]?.id ?? ""));
      })
      .catch((err: unknown) => {
        setResidentsError(err instanceof Error ? err.message : "Could not load residents");
      });
  }, []);

  /* ── Drawer effects ── */
  useEffect(() => {
    setEditMode(false);
    setEditError("");
    setEditSuccess("");
    if (drawerPkg) {
      setEditCarrier(drawerPkg.carrier_name);
      setEditTracking(drawerPkg.tracking_code);
      setEditDescription(drawerPkg.description || "");
      setEditLocation(drawerPkg.location_code || "");
    }
  }, [drawerPkg?.id]);

  useEffect(() => {
    if (!drawerPkg) {
      setAudit([]);
      setAuditError("");
      return;
    }
    getPackageAudit(drawerPkg.id)
      .then(setAudit)
      .catch((err: unknown) => {
        setAuditError(err instanceof Error ? err.message : "Could not load audit history");
      });
  }, [drawerPkg]);

  /* ── Auto-refresh ── */
  useEffect(() => {
    if (!["Today's Pickups", "Upcoming", "Preparation Queue", "Handoff", "History"].includes(section)) {
      return;
    }
    const refresh = () => {
      void fetchAppointments();
      void fetchPackages();
    };
    const interval = window.setInterval(refresh, 15000);
    return () => window.clearInterval(interval);
  }, [section, fetchAppointments, fetchPackages]);

  /* ── Register handler ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!regTracking.trim()) { setRegError("Tracking code is required"); return; }
    if (!regResidentId || !residents.some((r) => r.id === Number(regResidentId))) {
      setRegError("Please choose a valid resident"); return;
    }
    if (!regLocation.trim()) { setRegError("Storage location is required"); return; }
    setRegLoading(true);
    try {
      await registerPackage({
        carrier_name: regCarrier,
        tracking_code: regTracking.trim(),
        resident_id: Number(regResidentId),
        location_code: regLocation.trim(),
        ...(regDescription.trim() ? { description: regDescription.trim() } : {}),
      });
      setRegSuccess(true);
      setRegTracking("");
      setRegDescription("");
      setRegLocation("");
      fetchPackages();
      setTimeout(() => setRegSuccess(false), 3000);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Failed to register package");
    } finally {
      setRegLoading(false);
    }
  };

  /* ── Package edit ── */
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerPkg || editSaving) return;
    setEditError("");
    setEditSuccess("");
    if (!editCarrier.trim() || !editTracking.trim() || !editLocation.trim()) {
      setEditError("Carrier, tracking code, and storage location are required.");
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updatePackage(drawerPkg.id, {
        carrier_name: editCarrier.trim(),
        tracking_code: editTracking.trim(),
        description: editDescription.trim(),
        location_code: editLocation.trim(),
      });
      setDrawerPkg(updated);
      setEditMode(false);
      setEditSuccess("Package details saved successfully.");
      await fetchPackages();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not update package.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleStatusAdvance = async (pkg: PackageRecord) => {
    const transition = NEXT_STATUS[pkg.status];
    if (!transition) return;
    try {
      const updated = await updatePackage(pkg.id, { status: transition.next as PackageStatus });
      setDrawerPkg(updated);
      fetchPackages();
    } catch {
      // silent
    }
  };

  /* ── Handoff handlers ── */
  const runHandoffStep = async (
    appointment: PickupAppointment,
    step: () => Promise<HandoffResponse>,
    fallbackMessage: string,
  ): Promise<HandoffResponse | null> => {
    setHandoffBusyId(appointment.id);
    setHandoffError("");
    try {
      const result = await step();
      await Promise.all([fetchAppointments(), fetchPackages()]);
      return result;
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : fallbackMessage);
      return null;
    } finally {
      setHandoffBusyId(null);
    }
  };

  const handlePrepare = async (appointment: PickupAppointment) => {
    setPrepBusyId(appointment.id);
    setAppointmentsError("");
    try {
      await updatePackage(appointment.package_id, { status: "prepared" });
      await Promise.all([fetchAppointments(), fetchPackages()]);
    } catch (error) {
      setAppointmentsError(error instanceof Error ? error.message : "Could not prepare package.");
    } finally {
      setPrepBusyId(null);
    }
  };

  const handleVerifyIdentity = (appointment: PickupAppointment) =>
    runHandoffStep(appointment, () => verifyIdentity(appointment.id), "Could not verify identity.");

  const openSignoff = (appointment: PickupAppointment) => {
    setSignoffId(appointment.id);
    setSignoffName(appointment.resident_name || "");
    setSignoffAck(false);
    setSignoffNote("");
    setHandoffError("");
  };

  const handleSignoff = async (e: React.FormEvent, appointment: PickupAppointment) => {
    e.preventDefault();
    const recipientName = signoffName.trim();
    if (!recipientName) { setHandoffError("Recipient name is required."); return; }
    if (!signoffAck) { setHandoffError("The recipient must acknowledge receipt."); return; }
    const result = await runHandoffStep(
      appointment,
      () => signoff(appointment.id, recipientName, signoffNote.trim() || undefined),
      "Could not record sign-off."
    );
    if (result) setSignoffId(null);
  };

  const handleCompleteHandoff = async () => {
    if (!handoffTarget) return;
    const appointment = handoffTarget;
    const result = await runHandoffStep(
      appointment,
      () => completeHandoff(appointment.id),
      "Could not complete pickup."
    );
    if (result) {
      const completedBy = user?.name || "Staff";
      setCompletionInfo((current) => ({
        ...current,
        [appointment.id]: { at: result.timestamp, by: completedBy },
      }));
      setLastReceipt(toReceipt(appointment, result.timestamp, completedBy));
    }
    setHandoffTarget(null);
  };

  /* ── renderHandoffActions (inline sub-component) ── */
  const renderHandoffActions = (appointment: PickupAppointment): React.ReactNode => {
    const stage = handoffStage(appointment);
    const busy = handoffBusyId === appointment.id;

    if (stage === "Completed") return null;

    if (hasException(appointment)) {
      return (
        <p className="text-sm text-destructive">
          Resolve the package exception before continuing the handoff.
        </p>
      );
    }

    if (appointment.package_status !== "prepared") {
      return <p className="text-sm text-muted-foreground">Prepare the package before handoff.</p>;
    }

    if (stage === "Not checked in") {
      return (
        <p className="text-sm text-muted-foreground">
          Waiting for the resident to check in when they arrive.
        </p>
      );
    }

    if (stage === "Waiting") {
      return (
        <Button onClick={() => handleVerifyIdentity(appointment)} disabled={busy} className="gap-2">
          <ShieldCheck size={16} /> {busy ? "Verifying…" : "Verify Identity"}
        </Button>
      );
    }

    if (stage === "Identity verified") {
      if (signoffId !== appointment.id) {
        return (
          <Button onClick={() => openSignoff(appointment)} className="gap-2">
            <PenLine size={16} /> Sign Off
          </Button>
        );
      }
      return (
        <form onSubmit={(e) => handleSignoff(e, appointment)} className="space-y-4">
          <TextInput
            label="Recipient name"
            value={signoffName}
            onChange={(e) => setSignoffName(e.target.value)}
            maxLength={150}
            required
          />
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={signoffAck}
              onChange={(e) => setSignoffAck(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>The recipient acknowledges receiving this package.</span>
          </label>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={signoffNote}
              onChange={(e) => setSignoffNote(e.target.value)}
              maxLength={255}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || !signoffAck || !signoffName.trim()}>
              {busy ? "Saving…" : "Record Sign-off"}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setSignoffId(null)}>
              Cancel
            </Button>
          </div>
        </form>
      );
    }

    return (
      <Button onClick={() => setHandoffTarget(appointment)} disabled={busy} className="gap-2">
        <CheckCheck size={16} /> Complete Pickup
      </Button>
    );
  };

  /* ── Provide everything ── */
  const value: StaffState = {
    user, signOut, navigate, toggle, isDark,
    section, setSection, menu, setMenu, choose, date,
    packages, loading, searchQ, setSearchQ, statusFilter, setStatusFilter,
    sortKey, sortDir, sortedPackages, handleSort, fetchPackages,
    drawerPkg, setDrawerPkg, audit, auditError,
    editMode, setEditMode, editCarrier, setEditCarrier,
    editTracking, setEditTracking, editDescription, setEditDescription,
    editLocation, setEditLocation, editSaving, editError, setEditError,
    editSuccess, setEditSuccess, handleEditSave, handleStatusAdvance,
    regCarrier, setRegCarrier, regTracking, setRegTracking,
    residents, residentsError, regResidentId, setRegResidentId,
    regLocation, setRegLocation, regDescription, setRegDescription,
    regLoading, regSuccess, regError, handleRegister,
    appointments, appointmentsLoading, appointmentsError, fetchAppointments,
    activeAppointments, todaysAppointments, todaysPickups,
    prepQueue, checkedInAppointments, completedToday, now, todayKey,
    schedulingSettings, buildingName: schedulingSettings?.building_name ?? "",
    setSchedulingSettings, settingsBusy, settingsMessage,
    saveSchedulingSettings,
    handoffTarget, setHandoffTarget, handoffBusyId, handoffError,
    signoffId, setSignoffId, signoffName, setSignoffName,
    signoffAck, setSignoffAck, signoffNote, setSignoffNote,
    lastReceipt, setLastReceipt, prepBusyId, completionInfo,
    hasException, handlePrepare, handleVerifyIdentity,
    openSignoff, handleSignoff, handleCompleteHandoff,
    renderHandoffActions, logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* Re-export lucide icons used by renderHandoffActions */
import { CheckCheck, PenLine, ShieldCheck } from "lucide-react";
import { Button, TextInput } from "@/components/common";
