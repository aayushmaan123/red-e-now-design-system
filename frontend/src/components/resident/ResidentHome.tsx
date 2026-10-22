/**
 * ResidentHome — the main resident dashboard.
 *
 * Sprint 2 additions:
 *  - Home tab: shows real package count + latest PackageCards from getMyPackages()
 *  - Packages tab: full list of resident's packages via PackageCard components
 *
 * Schedule, Pickups, and Profile tabs remain as-is from Sprint 1.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock3, History, House, Moon, Package, Sun, UserRound, LogOut } from "lucide-react";
import { Avatar, Button, Card, EmptyState, PackageCard, TabBar } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { SparklesCore } from "@/components/ui/sparkles";
import { WeekStripCalendar, type DaySchedule } from "./WeekStripCalendar";
import { addDays, startOfDay } from "date-fns";
import { getMyPackages, type PackageRecord } from "@/api/packagesApi";

/* Bottom navigation tabs */
const tabs = [{ name: "Home", icon: House }, { name: "Packages", icon: Package }, { name: "Schedule", icon: CalendarDays }, { name: "Pickups", icon: History }, { name: "Profile", icon: UserRound }] as const;

export function ResidentHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();
  const [tab, setTab] = useState<(typeof tabs)[number]["name"]>("Home");
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();

  /* ── Package data ── */
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [pkgLoading, setPkgLoading] = useState(false);

  const fetchPackages = useCallback(async () => {
    setPkgLoading(true);
    try {
      const list = await getMyPackages();
      setPackages(list);
    } catch {
      // empty state shown
    } finally {
      setPkgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  /* Active packages = everything except picked_up */
  const activePackages = packages.filter((p) => p.status !== "picked_up");

  /* Demo schedule data — replace with usePickupSlots hook when backend is ready */
  const demoSchedules: DaySchedule[] = useMemo(() => {
    const today = startOfDay(new Date());
    return [
      { date: today, slots: [
        { id: "t-1", time: "10:00 AM – 10:30 AM", available: true },
        { id: "t-2", time: "11:00 AM – 11:30 AM", available: true },
        { id: "t-3", time: "1:00 PM – 1:30 PM", available: false },
        { id: "t-4", time: "3:00 PM – 3:30 PM", available: true },
      ]},
      { date: addDays(today, 1), slots: [
        { id: "t-5", time: "9:00 AM – 9:30 AM", available: true },
        { id: "t-6", time: "12:00 PM – 12:30 PM", available: true },
        { id: "t-7", time: "4:00 PM – 4:30 PM", available: true },
      ]},
      { date: addDays(today, 2), slots: [
        { id: "t-8", time: "10:00 AM – 10:30 AM", available: true },
        { id: "t-9", time: "2:00 PM – 2:30 PM", available: true },
      ], packageCount: 2 },
      { date: addDays(today, 4), slots: [
        { id: "t-10", time: "11:00 AM – 11:30 AM", available: true },
        { id: "t-11", time: "3:00 PM – 3:30 PM", available: false },
      ]},
    ];
  }, []);

  return (
    <div className="relative min-h-screen bg-background pb-20 transition-theme overflow-hidden">
      {/* Dark mode sparkle particles */}
      {isDark && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <SparklesCore
            id="dashboard-sparkles"
            background="transparent"
            minSize={0.4}
            maxSize={1.2}
            particleDensity={50}
            className="h-full w-full"
            particleColor="#E8344D"
            speed={0.8}
          />
        </div>
      )}

      {/* App header */}
      <header className="relative z-10 border-b border-border bg-card transition-theme">
        <div className="mx-auto flex h-17 max-w-5xl items-center justify-center px-6 relative">
          <span className="font-display text-[27px] font-bold uppercase leading-none text-primary">
            Red-E Now
          </span>
          <div className="absolute right-6 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="size-9 rounded-full p-0" aria-label="Toggle theme" onClick={toggle}>
              {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            </Button>
            <Button variant="ghost" size="sm" className="size-10 rounded-full p-0" aria-label="Open profile" onClick={() => setTab("Profile")}>
              <Avatar name={user?.name || "Resident"} />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-10 pt-8">
        {/* Dynamic heading */}
        <div className="mb-8 text-center animate-fade-in-up">
          <h1 className="font-display text-[37px] font-semibold uppercase leading-none sm:text-[44px]">
            {tab === "Home" ? `Welcome back, ${user?.name.split(" ")[0] || "Resident"}` : tab}
          </h1>
          {tab === "Home" && <p className="mt-3 text-sm text-muted-foreground">Here's what's happening at your building.</p>}
        </div>

        {/* Profile tab */}
        {tab === "Profile" ? (
          <Card className="p-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name || "Resident"} />
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
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
            <Button variant="secondary" className="mt-6" onClick={() => { signOut(); navigate({ to: "/login", replace: true }); }}>
              <LogOut size={16} /> Sign out
            </Button>
          </Card>
        ) : (
          <div className="grid gap-7 md:grid-cols-2">

            {/* ── YOUR PACKAGES — Home + Packages tabs ── */}
            {(tab === "Home" || tab === "Packages") && (
              <section className={`animate-fade-in-up stagger-1 ${tab === "Packages" ? "md:col-span-2" : ""}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold uppercase">Your Packages</h2>
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(activePackages.length).padStart(2, "0")}
                  </span>
                </div>

                {pkgLoading ? (
                  <Card className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">Loading packages…</p>
                  </Card>
                ) : activePackages.length > 0 ? (
                  <div className="space-y-3">
                    {(tab === "Home" ? activePackages.slice(0, 3) : activePackages).map((pkg) => (
                      <PackageCard
                        key={pkg.id}
                        carrierName={pkg.carrier_name}
                        trackingCode={pkg.tracking_code}
                        status={pkg.status}
                        arrivedAt={pkg.arrived_at}
                        description={pkg.description || undefined}
                      />
                    ))}
                    {tab === "Home" && activePackages.length > 3 && (
                      <Button variant="ghost" fullWidth onClick={() => setTab("Packages")} className="text-primary">
                        View all {activePackages.length} packages
                      </Button>
                    )}
                  </div>
                ) : (
                  <Card hover={tab === "Home"} onClick={tab === "Home" ? () => setTab("Packages") : undefined}>
                    <EmptyState icon={Package} message="No packages waiting for you right now" />
                  </Card>
                )}
              </section>
            )}

            {/* ── UPCOMING PICKUPS — Home tab only ── */}
            {tab === "Home" && (
              <section className="animate-fade-in-up stagger-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold uppercase">Upcoming Pickups</h2>
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(packages.filter((p) => p.status === "scheduled").length).padStart(2, "0")}
                  </span>
                </div>
                <Card hover onClick={() => setTab("Schedule")}>
                  <EmptyState icon={Clock3} message="No pickups scheduled — tap to schedule" />
                </Card>
              </section>
            )}

            {/* ── SCHEDULE tab ── */}
            {tab === "Schedule" && (
              <section className="animate-fade-in-up md:col-span-2">
                <WeekStripCalendar
                  schedules={demoSchedules}
                  selectedSlotId={selectedSlotId}
                  onSlotSelect={(_date, slot) => setSelectedSlotId(slot.id)}
                />
              </section>
            )}

            {/* ── PICKUPS tab ── */}
            {tab === "Pickups" && (
              <section className="animate-fade-in-up md:col-span-2">
                <h2 className="mb-3 font-display text-xl font-semibold uppercase">Past Pickups</h2>
                {packages.filter((p) => p.status === "picked_up").length > 0 ? (
                  <div className="space-y-3">
                    {packages.filter((p) => p.status === "picked_up").map((pkg) => (
                      <PackageCard
                        key={pkg.id}
                        carrierName={pkg.carrier_name}
                        trackingCode={pkg.tracking_code}
                        status={pkg.status}
                        arrivedAt={pkg.arrived_at}
                        description={pkg.description || undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <Card><EmptyState icon={History} message="No pickups yet" /></Card>
                )}
              </section>
            )}
          </div>
        )}

        {tab === "Home" && (
          <div className="mt-9 border-t border-border pt-6 animate-fade-in stagger-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-center">Red-E Now / Your residence, simplified</p>
          </div>
        )}
      </main>

      {/* Fixed bottom tab navigation */}
      <TabBar items={tabs} activeTab={tab} onTabChange={setTab as (name: string) => void} />
    </div>
  );
}
