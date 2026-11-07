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
import { getMyPackages, type PackageRecord } from "@/api/packagesApi";
import {
  getPickupSlots,
  type PickupSlot,
} from "@/api/schedulingApi";

import {
  getAppointments,
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  type PickupAppointment,
} from "@/api/appointmentsApi";


/* Bottom navigation tabs */
const tabs = [{ name: "Home", icon: House }, { name: "Packages", icon: Package }, { name: "Schedule", icon: CalendarDays }, { name: "Pickups", icon: History }, { name: "Profile", icon: UserRound }] as const;

export function ResidentHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();
  const [tab, setTab] = useState<(typeof tabs)[number]["name"]>("Home");

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


  /* Sprint 3 — real pickup appointments */
  const [appointments, setAppointments] = useState<PickupAppointment[]>([]);
  const [appointmentError, setAppointmentError] = useState("");
  const [appointmentSuccess, setAppointmentSuccess] = useState("");
  const [appointmentBusy, setAppointmentBusy] = useState(false);
  const [bookingPackageId, setBookingPackageId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("09:00");

  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);


  const fetchAppointments = useCallback(async () => {
    try {
      setAppointments(await getAppointments());
    } catch (error) {
      setAppointmentError(
        error instanceof Error ? error.message : "Could not load appointments."
      );
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);


  const refreshSlots = useCallback(async () => {
    if (!bookingDate) {
      setPickupSlots([]);
      return;
    }

    setSlotsLoading(true);
    try {
      setPickupSlots(await getPickupSlots(bookingDate));
    } catch (error) {
      setPickupSlots([]);
      setAppointmentError(
        error instanceof Error
          ? error.message
          : "Could not load available pickup times."
      );
    } finally {
      setSlotsLoading(false);
    }
  }, [bookingDate]);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "scheduled"
  );

  const availablePackages = packages.filter(
    (p) => p.status === "available"
  );

  const bookPickup = async () => {
    setAppointmentError("");
    setAppointmentSuccess("");

    if ((!bookingPackageId && reschedulingId === null) || !bookingDate || !bookingTime) {
      setAppointmentError("Select a package, date, and time.");
      return;
    }

    const selectedStart = `${bookingDate}T${bookingTime}`;
    if (!pickupSlots.some(
      (slot) => slot.pickup_start === selectedStart && slot.available
    )) {
      setAppointmentError(
        "This time is no longer available. Please select another slot."
      );
      await refreshSlots();
      return;
    }

    setAppointmentBusy(true);
    try {
      if (reschedulingId !== null) {
        await rescheduleAppointment(
          reschedulingId,
          `${bookingDate}T${bookingTime}`,
        );
        setAppointmentSuccess("Pickup rescheduled successfully!");
        setReschedulingId(null);
      } else {
        await createAppointment(
          Number(bookingPackageId),
          `${bookingDate}T${bookingTime}`,
        );
        setAppointmentSuccess("Pickup scheduled successfully!");
      }
      setBookingPackageId("");
      await Promise.all([fetchAppointments(), fetchPackages(), refreshSlots()]);
    } catch (error) {
      setAppointmentError(
        error instanceof Error ? error.message : "Could not schedule pickup."
      );
      await refreshSlots();
    } finally {
      setAppointmentBusy(false);
    }
  };


  const beginReschedule = (appointment: PickupAppointment) => {
    setAppointmentError("");
    setAppointmentSuccess("");
    setReschedulingId(appointment.id);
    setBookingPackageId(String(appointment.package_id));
    setBookingDate(appointment.pickup_start.slice(0, 10));
    setBookingTime(appointment.pickup_start.slice(11, 16));
    setTab("Schedule");
  };

  const cancelPickup = async (id: number) => {
    if (!window.confirm("Cancel this pickup appointment?")) return;

    setAppointmentError("");
    setAppointmentSuccess("");
    setAppointmentBusy(true);

    try {
      await cancelAppointment(id);
      setAppointmentSuccess("Pickup cancelled successfully.");
      await Promise.all([fetchAppointments(), fetchPackages(), refreshSlots()]);
    } catch (error) {
      setAppointmentError(
        error instanceof Error ? error.message : "Could not cancel pickup."
      );
    } finally {
      setAppointmentBusy(false);
    }
  };

  /* Active packages = everything except picked_up */
  const activePackages = packages.filter((p) => p.status !== "picked_up");

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
                        {...(pkg.description ? { description: pkg.description } : {})}
                      />
                    ))}
                    {tab === "Home" && activePackages.length > 3 && (
                      <Button variant="ghost" fullWidth onClick={() => setTab("Packages")} className="text-primary">
                        View all {activePackages.length} packages
                      </Button>
                    )}
                  </div>
                ) : (
                  <Card hover={tab === "Home"} {...(tab === "Home" ? { onClick: () => setTab("Packages") } : {})}>
                    <EmptyState icon={Package} message="No packages waiting for you right now" />
                  </Card>
                )}
              </section>
            )}


            {/* Sprint 3 — Upcoming pickups */}
            {tab === "Home" && (
              <section className="animate-fade-in-up stagger-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold uppercase">
                    Upcoming Pickups
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(upcomingAppointments.length).padStart(2, "0")}
                  </span>
                </div>

                {upcomingAppointments.length ? (
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => (
                      <Card key={appointment.id} className="p-4">
                        <p className="font-medium">
                          {appointment.carrier_name} — {appointment.tracking_code}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {new Date(appointment.pickup_start).toLocaleString()}
                        </p>
                        <button
                            type="button"
                            onClick={() => beginReschedule(appointment)}
                            disabled={appointmentBusy}
                            className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm"
                          >
                            Reschedule
                          </button>
                          <Button
                          variant="secondary"
                          size="sm"
                          className="mt-3"
                          onClick={() => cancelPickup(appointment.id)}
                          disabled={appointmentBusy}
                        >
                          Cancel Pickup
                        </Button>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card hover onClick={() => setTab("Schedule")}>
                    <EmptyState
                      icon={Clock3}
                      message="No pickups scheduled — tap to schedule"
                    />
                  </Card>
                )}
              </section>
            )}

            {/* Sprint 3 — Real pickup booking */}
            {tab === "Schedule" && (
              <section className="animate-fade-in-up md:col-span-2 space-y-5">
                <Card className="p-6">
                  <h2 className="font-display text-xl font-semibold uppercase">
                    {reschedulingId !== null ? "Reschedule Pickup" : "Schedule a Package Pickup"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choose an available package and a weekday pickup slot.
                    Appointments are 30 minutes, from 9 AM to 5 PM.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <label className="text-sm">
                      Package
                      <select
                        className="mt-2 w-full rounded-lg border border-border bg-background p-3"
                        value={bookingPackageId}
                        disabled={reschedulingId !== null}
                        onChange={(event) => setBookingPackageId(event.target.value)}
                      >
                        <option value="">
                          {reschedulingId !== null ? "Current package" : "Select package"}
                        </option>
                        {reschedulingId !== null && packages
                          .filter((pkg) => String(pkg.id) === bookingPackageId)
                          .map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.carrier_name} — {pkg.tracking_code}
                            </option>
                          ))}
                        {availablePackages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.carrier_name} — {pkg.tracking_code}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm">
                      Pickup Date
                      <input
                        type="date"
                        className="mt-2 w-full rounded-lg border border-border bg-background p-3"
                        min={new Date().toLocaleDateString("en-CA")}
                        value={bookingDate}
                        onChange={(event) => setBookingDate(event.target.value)}
                      />
                    </label>

                    <label className="text-sm">
                      Pickup Time
                      <select
                        className="mt-2 w-full rounded-lg border border-border bg-background p-3"
                        value={bookingTime}
                        onChange={(event) => setBookingTime(event.target.value)}
                      >
                        {Array.from({ length: 16 }, (_, index) => {
                          const hour = 9 + Math.floor(index / 2);
                          const minute = index % 2 ? "30" : "00";
                          const time = `${String(hour).padStart(2, "0")}:${minute}`;
                          return (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  </div>

                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Available pickup times
                    </label>
                    {slotsLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Loading available times...
                      </p>
                    ) : pickupSlots.filter((slot) => slot.available).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No open pickup times for this date. Choose another date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {pickupSlots
                          .filter((slot) => slot.available)
                          .map((slot) => {
                            const time = slot.pickup_start.slice(11, 16);
                            const selected = bookingTime === time;
                            return (
                              <button
                                key={slot.pickup_start}
                                type="button"
                                onClick={() => setBookingTime(time)}
                                aria-pressed={selected}
                                className={`min-h-11 rounded-lg border px-3 py-2 text-sm ${
                                  selected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-card"
                                }`}
                              >
                                {time}
                                <span className="block text-xs opacity-70">
                                  {slot.remaining} remaining
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {bookingDate && bookingTime && (
                    <p className="text-sm text-muted-foreground">
                      Review: {reschedulingId !== null ? "Change pickup to" : "Book pickup for"}{" "}
                      {new Date(`${bookingDate}T${bookingTime}`).toLocaleString()}
                    </p>
                  )}

<Button
                    className="mt-5"
                    onClick={bookPickup}
                    disabled={appointmentBusy || (reschedulingId === null && availablePackages.length === 0)}
                  >
                    {appointmentBusy ? "Saving..." : reschedulingId !== null ? "Confirm Reschedule" : "Confirm Pickup"}
                  </Button>

                  {reschedulingId !== null && (
                    <Button
                      className="mt-3 ml-3"
                      variant="outline"
                      onClick={() => {
                        setReschedulingId(null);
                        setBookingPackageId("");
                        setAppointmentError("");
                      }}
                    >
                      Cancel Rescheduling
                    </Button>
                  )}

                  {reschedulingId === null && availablePackages.length === 0 && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      You have no available packages to schedule.
                    </p>
                  )}
                  {appointmentError && (
                    <p role="alert" className="mt-3 text-sm text-red-500">
                      {appointmentError}
                    </p>
                  )}
                  {appointmentSuccess && (
                    <p className="mt-3 text-sm text-green-500">
                      {appointmentSuccess}
                    </p>
                  )}
                </Card>

                <Card className="p-6">
                  <h2 className="font-display text-xl font-semibold uppercase">
                    Your Scheduled Pickups
                  </h2>
                  {upcomingAppointments.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No pickups scheduled yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {upcomingAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-lg border border-border p-4"
                        >
                          <p className="font-medium">
                            {appointment.carrier_name} — {appointment.tracking_code}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {new Date(appointment.pickup_start).toLocaleString()}
                          </p>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-3"
                            onClick={() => cancelPickup(appointment.id)}
                            disabled={appointmentBusy}
                          >
                            Cancel Pickup
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
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
                        {...(pkg.description ? { description: pkg.description } : {})}
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
