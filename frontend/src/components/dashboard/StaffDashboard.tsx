/**
 * StaffDashboard — the management portal for front-desk staff.
 *
 * Sprint 2 additions:
 *  - "Register Package" section → real form (carrier, tracking, resident, description)
 *  - "Packages" section → Table with search, status filter, row-click Drawer detail
 *  - Dashboard stat cards wired to live package counts
 *
 * All other sections remain placeholder (Today's Pickups, Upcoming, etc.).
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Archive, CalendarDays, CheckCheck, ChevronRight, ClipboardList, Clock3,
  History, House, LogOut, Menu, Moon, Package, PackagePlus, Search, Sun,
  UserRound, UsersRound, X,
} from "lucide-react";
import {
  Avatar, Button, Card, EmptyState, Modal, TextInput, StatusBadge,
  Table, Drawer, SearchField, type Column,
} from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  getPackages, registerPackage, updatePackage, getPackageAudit,
  type PackageAuditEntry,
  type PackageRecord, type PackageStatus,
} from "@/api/packagesApi";

import { getResidents, type ResidentOption } from "@/api/residentsApi";
import { getAppointments, type PickupAppointment } from "@/api/appointmentsApi";

/* ── Sidebar nav items ── */
const items = [
  { label: "Dashboard", icon: House },
  { label: "Register Package", icon: PackagePlus },
  { label: "Packages", icon: Package },
  { label: "Today's Pickups", icon: CalendarDays },
  { label: "Upcoming", icon: Clock3 },
  { label: "Preparation Queue", icon: ClipboardList },
  { label: "Residents", icon: UsersRound },
  { label: "History", icon: History },
  { label: "Account", icon: UserRound },
];

/* ── Stat card definitions ── */
const statDefs = [
  { label: "Waiting Packages", icon: Package, tone: "text-info bg-info/10", filter: (p: PackageRecord) => p.status === "received" || p.status === "available" },
  { label: "Today's Pickups", icon: CalendarDays, tone: "text-primary bg-primary/10", filter: (p: PackageRecord) => p.status === "scheduled" },
  { label: "Prepared", icon: Archive, tone: "text-prepared bg-prepared/10", filter: (p: PackageRecord) => p.status === "prepared" },
  { label: "Completed Today", icon: CheckCheck, tone: "text-success bg-success/10", filter: (p: PackageRecord) => p.status === "picked_up" },
];

/* ── Carriers list ── */
const CARRIERS = ["FedEx", "UPS", "USPS", "Amazon", "DHL", "Other"] as const;

/* ── Status options for filter dropdown ── */
const STATUS_OPTIONS: { value: PackageStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "received", label: "Received" },
  { value: "available", label: "Available" },
  { value: "scheduled", label: "Scheduled" },
  { value: "prepared", label: "Prepared" },
  { value: "picked_up", label: "Picked Up" },
];

/* ── Packages Table columns ── */
const pkgColumns: Column<PackageRecord>[] = [
  { key: "resident_name", header: "Resident", sortable: true, render: (r) => (
    <span>
      <span className="font-medium">{r.resident_name}</span>
      {r.resident_unit && <span className="ml-1.5 text-muted-foreground">· {r.resident_unit}</span>}
    </span>
  )},
  { key: "carrier_name", header: "Carrier", sortable: true, width: "110px" },
  { key: "tracking_code", header: "Tracking", width: "180px", render: (r) => (
    <span className="font-mono text-xs">{r.tracking_code.length > 14 ? r.tracking_code.slice(0, 14) + "…" : r.tracking_code}</span>
  )},
  { key: "location_code", header: "Location", sortable: true,
    render: (r) => r.location_code || "Not assigned" },
  { key: "status", header: "Status", sortable: true, width: "120px", render: (r) => (
    <StatusBadge status={r.status} />
  )},
  { key: "arrived_at", header: "Arrived", sortable: true, width: "120px" },
];

/* ── Next status transitions ── */
const NEXT_STATUS: Partial<Record<PackageStatus, { label: string; next: PackageStatus }>> = {
  received: { label: "Mark Available", next: "available" },
  scheduled: { label: "Mark Prepared", next: "prepared" },
  prepared: { label: "Confirm Pickup", next: "picked_up" },
};

export function StaffDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();
  const [section, setSection] = useState("Dashboard");
  const [menu, setMenu] = useState(false);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());

  /* ── Package list state ── */
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<PackageStatus | "">("");
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  /* ── Drawer state (package detail) ── */
  const [drawerPkg, setDrawerPkg] = useState<PackageRecord | null>(null);

  // Each change shows who made it and when.
  const [audit, setAudit] = useState<PackageAuditEntry[]>([]);
  const [auditError, setAuditError] = useState("");

  // Staff can edit package details without changing its status.
  const [editMode, setEditMode] = useState(false);
  const [editCarrier, setEditCarrier] = useState("");
  const [editTracking, setEditTracking] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  /* ── Register form state ── */
  const [regCarrier, setRegCarrier] = useState<string>("FedEx");
  const [regTracking, setRegTracking] = useState("");
  // The dropdown starts empty until real residents are loaded.
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [residentsError, setResidentsError] = useState("");
  const [regResidentId, setRegResidentId] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regDescription, setRegDescription] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState("");


  /* Sprint 3 — staff pickup appointments */
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

  const todayKey = new Date().toLocaleDateString("en-CA");

  const activeAppointments = appointments.filter(
    (appointment) => appointment.status === "scheduled"
  );

  const todaysAppointments = activeAppointments.filter(
    (appointment) => appointment.pickup_start.slice(0, 10) === todayKey
  );

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

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    // Staff can only register packages for real resident accounts.
    getResidents()
      .then((list) => {
        setResidents(list);
        setRegResidentId((current) => current || String(list[0]?.id ?? ""));
      })
      .catch((err: unknown) => {
        setResidentsError(
          err instanceof Error ? err.message : "Could not load residents"
        );
      });
  }, []);

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

    // Reload history whenever the selected package changes.
    getPackageAudit(drawerPkg.id)
      .then(setAudit)
      .catch((err: unknown) => {
        setAuditError(
          err instanceof Error ? err.message : "Could not load audit history"
        );
      });
  }, [drawerPkg]);

  /* ── Sorted packages ── */
  const sortedPackages = [...packages].sort((a, b) => {
    if (!sortKey) return 0;
    const key = sortKey as keyof PackageRecord;
    const aVal = String(a[key] ?? "");
    const bVal = String(b[key] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });

  /* ── Handlers ── */
  const logout = () => { signOut(); navigate({ to: "/staff/login", replace: true }); };
  const choose = (label: string) => { setMenu(false); setSection(label); };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!regTracking.trim()) {
      setRegError("Tracking code is required");
      return;
    }
    if (!regResidentId || !residents.some(
      (resident) => resident.id === Number(regResidentId)
    )) {
      setRegError("Please choose a valid resident");
      return;
    }
    if (!regLocation.trim()) {
      setRegError("Storage location is required");
      return;
    }
    setRegLoading(true);
    try {
      await registerPackage({
        carrier_name: regCarrier,
        tracking_code: regTracking.trim(),
        resident_id: Number(regResidentId),
        location_code: regLocation.trim(),
        ...(regDescription.trim()
          ? { description: regDescription.trim() }
          : {}),
      });
      setRegSuccess(true);
      setRegTracking("");
      setRegDescription("");
      setRegLocation("");
      fetchPackages(); // refresh the list
      setTimeout(() => setRegSuccess(false), 3000);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Failed to register package");
    } finally {
      setRegLoading(false);
    }
  };

  const handleStatusAdvance = async (pkg: PackageRecord) => {
    const transition = NEXT_STATUS[pkg.status];
    if (!transition) return;
    try {
      const updated = await updatePackage(pkg.id, { status: transition.next });
      setDrawerPkg(updated);
      fetchPackages();
    } catch {
      // silent — real app would show toast
    }
  };

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

      // Refresh the drawer and table after MySQL accepts the changes.
      setDrawerPkg(updated);
      setEditMode(false);
      setEditSuccess("Package details saved successfully.");
      await fetchPackages();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Could not update package."
      );
    } finally {
      setEditSaving(false);
    }
  };

  /* ── Sidebar JSX ── */
  const sidebar = (
    <div className="flex h-full flex-col transition-theme">
      <div className="border-b border-border px-6 py-7">
        <span className="font-display text-[29px] font-bold uppercase leading-none text-primary">
          Red-E Now<span className="text-foreground">.</span>
        </span>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Management portal</p>
      </div>
      <nav aria-label="Management navigation" className="flex-1 space-y-0.5 px-3 py-6">
        {items.map(item => (
          <Button
            key={item.label}
            variant="ghost"
            size="md"
            onClick={() => choose(item.label)}
            aria-current={section === item.label ? "page" : undefined}
            className={`w-full justify-start gap-3 px-3 font-normal transition-all duration-200 ${section === item.label ? "bg-primary/10 font-medium text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
          >
            <item.icon size={18} strokeWidth={1.8} />
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="border-t border-border p-3 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 text-muted-foreground" onClick={toggle}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 text-muted-foreground" onClick={logout}>
          <LogOut size={18} /> Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:pl-[252px] transition-theme">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-[252px] border-r border-border bg-card lg:block transition-theme">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {menu && (
        <>
          <div className="fixed inset-0 z-30 bg-overlay lg:hidden animate-fade-in" onClick={() => setMenu(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 w-[min(82vw,280px)] bg-card shadow-xl lg:hidden animate-slide-in-left transition-theme">
            <Button variant="ghost" size="sm" aria-label="Close menu" className="absolute right-3 top-5 size-9 p-0" onClick={() => setMenu(false)}>
              <X size={20} />
            </Button>
            {sidebar}
          </aside>
        </>
      )}

      {/* Sticky top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-card transition-theme">
        <div className="mx-auto flex h-17 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" aria-label="Open menu" className="size-9 p-0 lg:hidden" onClick={() => setMenu(true)}>
              <Menu size={21} />
            </Button>
            <span className="font-display text-xl font-bold uppercase text-primary lg:hidden">
              Red-E Now<span className="text-foreground">.</span>
            </span>
            <span className="hidden font-display text-lg font-semibold uppercase lg:inline">{section}</span>
            <span className="hidden rounded bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase text-primary sm:inline">Management</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="size-9 rounded-full p-0 lg:hidden" aria-label="Toggle theme" onClick={toggle}>
              {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => choose("Account")} className="h-auto gap-3 p-0">
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-medium">{user?.name}</span>
                <span className="block text-xs text-muted-foreground">Property staff</span>
              </span>
              <Avatar name={user?.name || "Staff"} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-9 lg:px-10 lg:pt-12">

        {/* ═══════ DASHBOARD HOME ═══════ */}
        {section === "Dashboard" ? (
          <>
            <div className="mb-9 animate-fade-in-up">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Oakwood Residences <span className="mx-2">/</span> {date}
              </p>
              <h1 className="font-display text-[38px] font-semibold uppercase leading-none sm:text-[48px]">
                Welcome back, {user?.name.split(" ")[0] || "Team"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">Your building at a glance today.</p>
            </div>

            {/* Stat cards — counts from live package data */}
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
              {statDefs.map((s, i) => (
                <Card key={s.label} hover className={`min-h-[150px] p-4 sm:p-5 animate-float-up stagger-${i + 1}`}>
                  <div className={`mb-5 flex size-9 items-center justify-center rounded-lg transition-colors duration-300 ${s.tone}`}>
                    <s.icon size={18} strokeWidth={1.8} />
                  </div>
                  <div className="font-display text-[35px] font-semibold leading-none">
                    {s.label === "Today's Pickups"
                      ? todaysAppointments.length
                      : packages.filter(s.filter).length}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
                </Card>
              ))}
            </div>

            {/* Recent activity + Quick actions */}
            <div className="mt-10 grid gap-9 xl:grid-cols-[1.5fr_1fr]">
              <section className="animate-fade-in-up stagger-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-[23px] font-semibold uppercase">Recent Activity</h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Latest updates</span>
                </div>
                {packages.length > 0 ? (
                  <div className="space-y-2">
                    {packages.slice(0, 4).map((p) => (
                      <Card key={p.id} hover onClick={() => { setDrawerPkg(p); }} className="flex items-center gap-3 p-3">
                        <Package size={16} className="shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.carrier_name} · {p.resident_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.tracking_code}</p>
                        </div>
                        <StatusBadge status={p.status} />
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card><EmptyState icon={Archive} message="No recent activity" /></Card>
                )}
              </section>
              <section className="animate-fade-in-up stagger-6">
                <h2 className="mb-4 font-display text-[23px] font-semibold uppercase">Quick Actions</h2>
                <div className="space-y-3">
                  {[{ label: "Add Package", icon: PackagePlus }, { label: "Today's Queue", icon: ClipboardList }, { label: "Search Resident", icon: Search }].map(a => (
                    <Button
                      key={a.label}
                      variant="secondary"
                      size="lg"
                      fullWidth
                      onClick={() => choose(a.label === "Add Package" ? "Register Package" : a.label === "Today's Queue" ? "Today's Pickups" : "Residents")}
                      className="h-[60px] justify-start bg-card px-5 text-sm shadow-card hover:shadow-lg transition-all duration-200"
                    >
                      <a.icon size={19} className="text-primary" />
                      {a.label}
                      <ChevronRight size={17} className="ml-auto text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  ))}
                </div>
              </section>
            </div>
          </>

        /* ═══════ REGISTER PACKAGE ═══════ */
        ) : section === "Register Package" ? (
          <>
            <div className="mb-7 animate-fade-in-up">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Oakwood Residences / Management</p>
              <h1 className="font-display text-[38px] font-semibold uppercase leading-none">Register Package</h1>
              <p className="mt-3 text-sm text-muted-foreground">Log a new package that arrived at the building.</p>
            </div>

            <Card className="max-w-xl animate-fade-in-up stagger-1">
              <form onSubmit={handleRegister} className="space-y-5 p-6">
                {/* Carrier */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Carrier <span className="text-primary">*</span></label>
                  <select
                    value={regCarrier}
                    onChange={(e) => setRegCarrier(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Tracking code */}
                <TextInput
                  label="Tracking Code"
                  value={regTracking}
                  onChange={(e) => setRegTracking(e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                  required
                />

                {/* These names and units come from the backend. */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Resident <span className="text-primary">*</span></label>
                  <select
                    value={regResidentId}
                    onChange={(e) => setRegResidentId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Choose a resident</option>
                    {residents.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.name} — Unit {resident.unit || "Not assigned"}
                      </option>
                    ))}
                  </select>
                  {residentsError && (
                    <p className="mt-1 text-xs text-destructive">
                      {residentsError}
                    </p>
                  )}
                </div>

                {/* Staff need to know exactly where the package is stored. */}
                <TextInput
                  label="Storage Location"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  placeholder="e.g. SHELF-A1"
                  required
                />

                {/* Description */}
                <TextInput
                  label="Description"
                  value={regDescription}
                  onChange={(e) => setRegDescription(e.target.value)}
                  placeholder="e.g. Small box, Large envelope"
                />

                {/* Error / Success */}
                {regError && <p className="text-sm text-primary">{regError}</p>}
                {regSuccess && <p className="text-sm text-success">Package registered successfully!</p>}

                {/* Submit */}
                <Button type="submit" fullWidth disabled={regLoading}>
                  {regLoading ? "Registering…" : "Register Package"}
                </Button>
              </form>
            </Card>
          </>

        /* ═══════ PACKAGES LIST ═══════ */
        ) : section === "Packages" ? (
          <>
            <div className="mb-7 animate-fade-in-up">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Oakwood Residences / Management</p>
              <h1 className="font-display text-[38px] font-semibold uppercase leading-none">Packages</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {packages.length} package{packages.length !== 1 ? "s" : ""} in the system
              </p>
            </div>

            {/* Filters row */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center animate-fade-in-up stagger-1">
              <div className="flex-1">
                <SearchField
                  value={searchQ}
                  onChange={setSearchQ}
                  placeholder="Search name, tracking, carrier, location…"
                  debounceMs={300}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PackageStatus | "")}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="animate-fade-in-up stagger-2">
              <Table<PackageRecord>
                columns={pkgColumns}
                data={sortedPackages}
                keyExtractor={(r) => String(r.id)}
                {...(sortKey ? { sortKey } : {})}
                sortDir={sortDir}
                onSort={handleSort}
                onRowClick={(r) => setDrawerPkg(r)}
                emptyMessage={loading ? "Loading packages…" : "No packages found"}
              />
            </div>
          </>


        /* ═══════ SPRINT 3 PICKUP SCHEDULE ═══════ */
        ) : section === "Today's Pickups" || section === "Upcoming" ? (
          <>
            <div className="mb-7 animate-fade-in-up">
              <h1 className="font-display text-[38px] font-semibold uppercase">
                {section}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Live pickup appointments from MySQL.
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={fetchAppointments}
              disabled={appointmentsLoading}
              className="mb-5"
            >
              {appointmentsLoading ? "Refreshing..." : "Refresh Appointments"}
            </Button>

            {appointmentsError && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {appointmentsError}
              </p>
            )}

            <div className="space-y-3">
              {(section === "Today's Pickups"
                ? todaysAppointments
                : activeAppointments.filter(
                    (a) => a.pickup_start.slice(0, 10) >= todayKey
                  )
              ).map((appointment) => (
                <Card key={appointment.id} className="p-5">
                  <p className="text-lg font-semibold">
                    {appointment.resident_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unit {appointment.resident_unit || "Not assigned"}
                  </p>
                  <p className="mt-3 text-sm">
                    {appointment.carrier_name} — {appointment.tracking_code}
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {new Date(appointment.pickup_start).toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-primary">Scheduled</p>
                </Card>
              ))}
            </div>

            {!appointmentsLoading &&
              (section === "Today's Pickups"
                ? todaysAppointments
                : activeAppointments.filter(
                    (a) => a.pickup_start.slice(0, 10) >= todayKey
                  )
              ).length === 0 && !appointmentsError && (
                <Card className="p-6">
                  <EmptyState
                    icon={CalendarDays}
                    message="No scheduled pickups for this period"
                  />
                </Card>
              )}
          </>

        /* ═══════ ACCOUNT ═══════ */
        ) : section === "Account" ? (
          <>
            <h1 className="mb-6 font-display text-[38px] font-semibold uppercase animate-fade-in-up">Account</h1>
            <Card className="max-w-xl p-6 animate-fade-in-up stagger-1">
              <div className="flex items-center gap-4">
                <Avatar name={user?.name || "Staff"} />
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">Oakwood Residences · Management</p>
              <div className="mt-6 flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Button variant="secondary" size="sm" onClick={toggle} className="gap-2">
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                  {isDark ? "Light" : "Dark"}
                </Button>
              </div>
              <Button variant="secondary" className="mt-6" onClick={logout}>
                <LogOut size={16} /> Logout
              </Button>
            </Card>
          </>

        /* ═══════ OTHER SECTIONS (placeholder) ═══════ */
        ) : (
          <>
            <div className="mb-7 animate-fade-in-up">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Oakwood Residences / Management</p>
              <h1 className="font-display text-[38px] font-semibold uppercase leading-none">{section}</h1>
            </div>
            <Card className="max-w-3xl animate-fade-in-up stagger-1">
              <EmptyState
                icon={items.find(i => i.label === section)?.icon || Search}
                message={section === "Residents" ? "No residents to display" : section === "History" ? "No activity yet" : "Nothing here yet"}
              />
            </Card>
          </>
        )}
      </main>

      {/* ═══════ PACKAGE DETAIL DRAWER ═══════ */}
      <Drawer open={!!drawerPkg} onClose={() => setDrawerPkg(null)} title="Package Detail">
        {drawerPkg && (
          <div className="space-y-6">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <StatusBadge status={drawerPkg.status} />
              <span className="font-mono text-xs text-muted-foreground">ID #{drawerPkg.id}</span>
            </div>

            {/* Carrier & tracking */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Carrier</p>
              <p className="mt-1 text-sm font-medium">{drawerPkg.carrier_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tracking Code</p>
              <p className="mt-1 font-mono text-sm">{drawerPkg.tracking_code}</p>
            </div>

            {/* Description */}
            {drawerPkg.description && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="mt-1 text-sm">{drawerPkg.description}</p>
              </div>
            )}

            {/* Resident info */}
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resident</p>
              <p className="mt-1 text-sm font-medium">{drawerPkg.resident_name}</p>
              {drawerPkg.resident_unit && (
                <p className="text-sm text-muted-foreground">Unit {drawerPkg.resident_unit}</p>
              )}
            </div>

            {/* Staff can find the physical package using this code. */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Storage Location
              </p>
              <p className="mt-1 text-sm">
                {drawerPkg.location_code || "Not assigned"}
              </p>
            </div>

            {/* Arrival date */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Arrived</p>
              <p className="mt-1 text-sm">{drawerPkg.arrived_at}</p>
            </div>

            {/* Staff can update package details from this drawer. */}
            <div className="border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Package Details</h3>
                {!editMode && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditCarrier(drawerPkg.carrier_name);
                      setEditTracking(drawerPkg.tracking_code);
                      setEditDescription(drawerPkg.description || "");
                      setEditLocation(drawerPkg.location_code || "");
                      setEditError("");
                      setEditSuccess("");
                      setEditMode(true);
                    }}
                  >
                    Edit Package
                  </Button>
                )}
              </div>

              {editSuccess && (
                <p className="mt-3 text-sm text-success">{editSuccess}</p>
              )}

              {editMode && (
                <form onSubmit={handleEditSave} className="mt-4 space-y-4">
                  <TextInput
                    label="Carrier"
                    value={editCarrier}
                    onChange={(e) => setEditCarrier(e.target.value)}
                    required
                  />
                  <TextInput
                    label="Tracking Code"
                    value={editTracking}
                    onChange={(e) => setEditTracking(e.target.value)}
                    required
                  />
                  <TextInput
                    label="Description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <TextInput
                    label="Storage Location"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    required
                  />

                  {editError && (
                    <p className="text-sm text-destructive">{editError}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={editSaving}>
                      {editSaving ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={editSaving}
                      onClick={() => {
                        setEditMode(false);
                        setEditError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* The backend records edits and status changes. */}
            <div className="border-t border-border pt-5">
              <h3 className="mb-3 text-sm font-semibold">Audit History</h3>
              {auditError && (
                <p className="text-sm text-destructive">{auditError}</p>
              )}
              {!auditError && audit.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No changes recorded yet.
                </p>
              )}
              <div className="space-y-3">
                {audit.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">
                      {entry.action.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.changed_by_name || `Staff #${entry.changed_by}`}
                      {" · "}
                      {new Date(entry.changed_at).toLocaleString()}
                    </p>
                    {entry.new_values && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(entry.new_values).map(([field, value]) => (
                          <p key={field} className="break-words text-xs">
                            <span className="font-medium">
                              {field.replaceAll("_", " ")}:
                            </span>{" "}
                            {String(value ?? "Not set")}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Status advance button */}
            {NEXT_STATUS[drawerPkg.status] && (
              <Button fullWidth onClick={() => handleStatusAdvance(drawerPkg)}>
                {NEXT_STATUS[drawerPkg.status]!.label}
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
