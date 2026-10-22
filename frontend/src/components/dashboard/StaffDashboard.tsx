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
  getPackages, registerPackage, updatePackage,
  type PackageRecord, type PackageStatus,
} from "@/api/packagesApi";

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
  { key: "status", header: "Status", sortable: true, width: "120px", render: (r) => (
    <StatusBadge status={r.status} />
  )},
  { key: "arrived_at", header: "Arrived", sortable: true, width: "120px" },
];

/* ── Next status transitions ── */
const NEXT_STATUS: Partial<Record<PackageStatus, { label: string; next: PackageStatus }>> = {
  received: { label: "Mark Available", next: "available" },
  available: { label: "Mark Available", next: "available" },
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

  /* ── Register form state ── */
  const [regCarrier, setRegCarrier] = useState<string>("FedEx");
  const [regTracking, setRegTracking] = useState("");
  const [regResidentId, setRegResidentId] = useState("1");
  const [regDescription, setRegDescription] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState("");

  /* ── Fetch packages ── */
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPackages({
        status: statusFilter || undefined,
        search: searchQ || undefined,
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

  /* ── Sorted packages ── */
  const sortedPackages = [...packages].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = String((a as Record<string, unknown>)[sortKey] ?? "");
    const bVal = String((b as Record<string, unknown>)[sortKey] ?? "");
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
    if (!regTracking.trim()) { setRegError("Tracking code is required"); return; }
    setRegLoading(true);
    try {
      await registerPackage({
        carrier_name: regCarrier,
        tracking_code: regTracking.trim(),
        resident_id: Number(regResidentId),
        description: regDescription.trim() || undefined,
      });
      setRegSuccess(true);
      setRegTracking("");
      setRegDescription("");
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
                    {packages.filter(s.filter).length}
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
                  onChange={setRegTracking}
                  placeholder="e.g. 1Z999AA10123456784"
                  required
                />

                {/* Resident (simplified — ID input for MVP; will be search dropdown later) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Resident ID <span className="text-primary">*</span></label>
                  <select
                    value={regResidentId}
                    onChange={(e) => setRegResidentId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="1">Maya Chen — Unit 4B</option>
                    <option value="3">Jordan Lee — Unit 7A</option>
                    <option value="4">Sam Rivera — Unit 2C</option>
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">Resident search will replace this dropdown once the residents endpoint is ready.</p>
                </div>

                {/* Description */}
                <TextInput
                  label="Description"
                  value={regDescription}
                  onChange={setRegDescription}
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
                  placeholder="Search by name, tracking, carrier…"
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
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                onRowClick={(r) => setDrawerPkg(r)}
                emptyMessage={loading ? "Loading packages…" : "No packages found"}
              />
            </div>
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

            {/* Arrival date */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Arrived</p>
              <p className="mt-1 text-sm">{drawerPkg.arrived_at}</p>
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
