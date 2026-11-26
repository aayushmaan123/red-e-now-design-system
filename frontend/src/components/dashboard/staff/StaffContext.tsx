/**
 * StaffContext — shared state for every staff console section.
 *
 * One provider owns the data (packages, residents, appointments, scheduling
 * settings), the handoff workflow and the section routing, so each section
 * component reads only what it needs through `useStaff()`.
 *
 * Every load reports failure (`*Error`) and can be retried; nothing fails silently.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { HandoffActions } from "./StaffHandoffActions";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
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
  handoffStage,
  isFlagged,
  toReceipt,
  type HandoffReceipt,
} from "./StaffTypes";

/* ────────────────────────────────────────────── */
/*  Context shape                                 */
/* ────────────────────────────────────────────── */

export interface StaffState {
  /* Auth */
  user: ReturnType<typeof useAuth>["user"];
  logout: () => void;

  /* Section routing */
  section: string;
  setSection: (s: string) => void;
  /** Small-screen navigation menu. */
  menu: boolean;
  setMenu: (v: boolean) => void;
  choose: (label: string) => void;
  /** Command menu (Ctrl/Cmd+K). */
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  date: string;

  /* Package list (as filtered by the Packages search and status filter) */
  packages: PackageRecord[];
  /**
   * Every package the console has loaded, regardless of the Packages filters.
   * Counts, the dashboard and the command menu read this, so a search typed
   * on the Packages page never changes their numbers.
   */
  allPackages: PackageRecord[];
  loading: boolean;
  /** True once the package list has loaded at least once. */
  packagesLoaded: boolean;
  packagesError: string;
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
  auditLoading: boolean;
  auditError: string;
  reloadAudit: () => void;
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
  /** Id of the package whose status change is in flight. */
  statusBusyId: number | null;
  statusError: string;

  /* Register form */
  regCarrier: string;
  setRegCarrier: (v: string) => void;
  regTracking: string;
  setRegTracking: (v: string) => void;
  residents: ResidentOption[];
  residentsLoading: boolean;
  residentsError: string;
  fetchResidents: () => Promise<void>;
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
  /** True once appointments have loaded at least once. */
  appointmentsLoaded: boolean;
  appointmentsError: string;
  /** When appointments last loaded successfully (epoch ms), or null. */
  appointmentsUpdatedAt: number | null;
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
  settingsLoading: boolean;
  settingsLoadError: string;
  loadSchedulingSettings: () => Promise<void>;
  settingsBusy: boolean;
  settingsSaved: boolean;
  settingsError: string;
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
  prepError: string;
  completionInfo: Record<number, { at: string; by: string }>;
  hasException: (a: PickupAppointment) => boolean;

  /* Handoff actions */
  handlePrepare: (a: PickupAppointment) => Promise<void>;
  handleVerifyIdentity: (a: PickupAppointment) => Promise<HandoffResponse | null>;
  openSignoff: (a: PickupAppointment) => void;
  handleSignoff: (e: React.FormEvent, a: PickupAppointment) => Promise<void>;
  handleCompleteHandoff: () => Promise<void>;
  renderHandoffActions: (a: PickupAppointment) => ReactNode;
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
  received: { next: "available", label: "Mark available for pickup" },
  scheduled: { next: "prepared", label: "Mark prepared" },
};

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Newer rows replace their older copies by id; rows not seen before go first (newest arrivals). */
function mergePackages(current: PackageRecord[], incoming: PackageRecord[]): PackageRecord[] {
  if (incoming.length === 0) return current;
  const fresh = new Map(incoming.map((p) => [p.id, p]));
  const known = new Set(current.map((p) => p.id));
  return [
    ...incoming.filter((p) => !known.has(p.id)),
    ...current.map((p) => fresh.get(p.id) ?? p),
  ];
}

/* ────────────────────────────────────────────── */
/*  Provider                                      */
/* ────────────────────────────────────────────── */

export function StaffProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState("Dashboard");
  const [menu, setMenu] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  /* ── Package list state ── */
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [allPackages, setAllPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [packagesError, setPackagesError] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<PackageStatus | "">("");
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const packagesRequest = useRef(0);

  /* ── Drawer state ── */
  const [drawerPkg, setDrawerPkg] = useState<PackageRecord | null>(null);
  const [audit, setAudit] = useState<PackageAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditAttempt, setAuditAttempt] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editCarrier, setEditCarrier] = useState("");
  const [editTracking, setEditTracking] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);
  const [statusError, setStatusError] = useState("");

  /* ── Register form ── */
  const [regCarrier, setRegCarrier] = useState<string>("FedEx");
  const [regTracking, setRegTracking] = useState("");
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
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
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [appointmentsUpdatedAt, setAppointmentsUpdatedAt] = useState<number | null>(null);

  const fetchAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    setAppointmentsError("");
    try {
      setAppointments(await getAppointments());
      setAppointmentsLoaded(true);
      setAppointmentsUpdatedAt(Date.now());
    } catch (error) {
      setAppointmentsError(messageOf(error, "Could not load appointments."));
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
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsLoadError, setSettingsLoadError] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const loadSchedulingSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsLoadError("");
    try {
      setSchedulingSettings(await getSchedulingSettings());
    } catch (error) {
      setSettingsLoadError(messageOf(error, "Could not load scheduling settings."));
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedulingSettings();
  }, [loadSchedulingSettings]);

  const saveSchedulingSettings = async () => {
    if (!schedulingSettings) return;
    setSettingsBusy(true);
    setSettingsSaved(false);
    setSettingsError("");
    try {
      await updateSchedulingSettings({
        open_time: schedulingSettings.open_time,
        close_time: schedulingSettings.close_time,
        slot_minutes: schedulingSettings.slot_minutes,
        default_capacity: schedulingSettings.default_capacity,
        cancellation_cutoff_minutes: schedulingSettings.cancellation_cutoff_minutes,
      });
      setSettingsSaved(true);
      await fetchAppointments();
    } catch (error) {
      setSettingsError(messageOf(error, "Could not save scheduling settings."));
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
  const [prepError, setPrepError] = useState("");
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
    allPackages.filter((p) => isFlagged(p.has_exception)).map((p) => p.id)
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

  // A new section starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

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
    const request = ++packagesRequest.current;
    const filtered = Boolean(statusFilter || searchQ.trim());
    setLoading(true);
    try {
      const list = await getPackages({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(searchQ.trim() ? { search: searchQ.trim() } : {}),
      });
      // An unfiltered answer is the whole list; a filtered one only refreshes the rows it returned.
      setAllPackages((current) => (filtered ? mergePackages(current, list) : list));
      if (request !== packagesRequest.current) return; // a newer search has been sent
      setPackages(list);
      setPackagesLoaded(true);
      setPackagesError("");
    } catch (error) {
      if (request !== packagesRequest.current) return;
      setPackagesError(messageOf(error, "Could not load packages."));
    } finally {
      if (request === packagesRequest.current) setLoading(false);
    }
  }, [statusFilter, searchQ]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  /* ── Resident loading ── */
  const fetchResidents = useCallback(async () => {
    setResidentsLoading(true);
    setResidentsError("");
    try {
      const list = await getResidents();
      setResidents(list);
      setRegResidentId((current) => current || String(list[0]?.id ?? ""));
    } catch (error) {
      setResidentsError(messageOf(error, "Could not load residents"));
    } finally {
      setResidentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResidents();
  }, [fetchResidents]);

  /* ── Drawer effects ── */
  useEffect(() => {
    setEditMode(false);
    setEditError("");
    setEditSuccess("");
    setStatusError("");
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
      setAuditLoading(false);
      return;
    }
    let cancelled = false;
    setAuditLoading(true);
    setAuditError("");
    getPackageAudit(drawerPkg.id)
      .then((entries) => { if (!cancelled) setAudit(entries); })
      .catch((error: unknown) => {
        if (!cancelled) setAuditError(messageOf(error, "Could not load audit history"));
      })
      .finally(() => { if (!cancelled) setAuditLoading(false); });
    return () => { cancelled = true; };
  }, [drawerPkg, auditAttempt]);

  const reloadAudit = () => setAuditAttempt((n) => n + 1);

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
      const created = await registerPackage({
        carrier_name: regCarrier,
        tracking_code: regTracking.trim(),
        resident_id: Number(regResidentId),
        location_code: regLocation.trim(),
        ...(regDescription.trim() ? { description: regDescription.trim() } : {}),
      });
      setAllPackages((current) => mergePackages(current, [created]));
      setRegSuccess(true);
      setRegTracking("");
      setRegDescription("");
      setRegLocation("");
      fetchPackages();
      setTimeout(() => setRegSuccess(false), 3000);
    } catch (err) {
      setRegError(messageOf(err, "Failed to register package"));
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
      setAllPackages((current) => mergePackages(current, [updated]));
      setDrawerPkg(updated);
      setEditMode(false);
      setEditSuccess("Package details saved.");
      await fetchPackages();
    } catch (err) {
      setEditError(messageOf(err, "Could not update package."));
    } finally {
      setEditSaving(false);
    }
  };

  const handleStatusAdvance = async (pkg: PackageRecord) => {
    const transition = NEXT_STATUS[pkg.status];
    if (!transition) return;
    setStatusBusyId(pkg.id);
    setStatusError("");
    try {
      const updated = await updatePackage(pkg.id, { status: transition.next as PackageStatus });
      setAllPackages((current) => mergePackages(current, [updated]));
      setDrawerPkg(updated);
      fetchPackages();
    } catch (error) {
      setStatusError(messageOf(error, "Could not change the package status. Try again."));
    } finally {
      setStatusBusyId(null);
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
      setHandoffError(messageOf(error, fallbackMessage));
      return null;
    } finally {
      setHandoffBusyId(null);
    }
  };

  const handlePrepare = async (appointment: PickupAppointment) => {
    setPrepBusyId(appointment.id);
    setPrepError("");
    try {
      await updatePackage(appointment.package_id, { status: "prepared" });
      await Promise.all([fetchAppointments(), fetchPackages()]);
    } catch (error) {
      setPrepError(messageOf(error, "Could not prepare package."));
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

  const renderHandoffActions = useCallback(
    (appointment: PickupAppointment) => <HandoffActions appointment={appointment} />,
    [],
  );

  /* ── Provide everything ── */
  const value: StaffState = {
    user, logout,
    section, setSection, menu, setMenu, choose, commandOpen, setCommandOpen, date,
    packages, allPackages, loading, packagesLoaded, packagesError,
    searchQ, setSearchQ, statusFilter, setStatusFilter,
    sortKey, sortDir, sortedPackages, handleSort, fetchPackages,
    drawerPkg, setDrawerPkg, audit, auditLoading, auditError, reloadAudit,
    editMode, setEditMode, editCarrier, setEditCarrier,
    editTracking, setEditTracking, editDescription, setEditDescription,
    editLocation, setEditLocation, editSaving, editError, setEditError,
    editSuccess, setEditSuccess, handleEditSave, handleStatusAdvance,
    statusBusyId, statusError,
    regCarrier, setRegCarrier, regTracking, setRegTracking,
    residents, residentsLoading, residentsError, fetchResidents,
    regResidentId, setRegResidentId,
    regLocation, setRegLocation, regDescription, setRegDescription,
    regLoading, regSuccess, regError, handleRegister,
    appointments, appointmentsLoading, appointmentsLoaded, appointmentsError,
    appointmentsUpdatedAt, fetchAppointments,
    activeAppointments, todaysAppointments, todaysPickups,
    prepQueue, checkedInAppointments, completedToday, now, todayKey,
    schedulingSettings, buildingName: schedulingSettings?.building_name ?? "",
    setSchedulingSettings, settingsLoading, settingsLoadError, loadSchedulingSettings,
    settingsBusy, settingsSaved, settingsError, saveSchedulingSettings,
    handoffTarget, setHandoffTarget, handoffBusyId, handoffError,
    signoffId, setSignoffId, signoffName, setSignoffName,
    signoffAck, setSignoffAck, signoffNote, setSignoffNote,
    lastReceipt, setLastReceipt, prepBusyId, prepError, completionInfo,
    hasException, handlePrepare, handleVerifyIdentity,
    openSignoff, handleSignoff, handleCompleteHandoff,
    renderHandoffActions,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
