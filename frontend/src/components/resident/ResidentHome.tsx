/**
 * ResidentHome — the main resident dashboard.
 *
 * All business logic, API calls, and component interfaces are unchanged.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays, Circle, CircleCheck, Clock3, LogIn, History, House,
  Package, Palette, UserRound, LogOut, ArrowRight,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, Button, Card, EmptyState, PackageCard, StatusBadge, TabBar, ThemeTabs } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
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
import { checkIn } from "@/api/handoffApi";


/* ── Animation helpers ── */
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const item = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
};

/* Sprint 4 — completed pickup shown as a receipt on the Pickups tab */
interface PickupReceipt {
  key: string;
  carrierName: string;
  trackingCode: string;
  description: string;
  pickedUpAt: string | null;
}

function PickupReceiptCard({ receipt, className }: { receipt: PickupReceipt; className?: string }) {
  const when = receipt.pickedUpAt ? new Date(receipt.pickedUpAt) : null;
  return (
    <motion.div variants={item}>
      <Card className={`p-5 ${className ?? ""}`}>
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
            <CircleCheck size={22} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-semibold leading-tight">Package Picked Up</h3>
              <StatusBadge status="picked_up" />
            </div>
            <p className="mt-2 text-sm font-medium">{receipt.carrierName}</p>
            <p className="break-all font-mono text-xs text-muted-foreground">{receipt.trackingCode}</p>
            {receipt.description && (
              <p className="mt-1 text-xs text-muted-foreground">{receipt.description}</p>
            )}
            <div className="mt-3 flex items-center gap-1.5 text-sm">
              <Clock3 size={14} className="text-muted-foreground" />
              {when && !Number.isNaN(when.getTime())
                ? when.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                : "Date unavailable"}
            </div>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Thank you for picking up your package. See you next delivery!
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* Sprint 4 — resident-side progress through the front-desk handoff */
function formatTime(value: string) {
  return new Date(value).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function HandoffTracker({ appointment }: { appointment: PickupAppointment }) {
  const steps = [
    { label: "Checked in", at: appointment.checked_in_at },
    { label: "Identity verification", at: appointment.identity_verified_at },
    { label: "Sign-off", at: appointment.acknowledged_at },
    { label: "Pickup complete", at: appointment.handed_off_at, done: appointment.status === "completed" },
  ];
  return (
    <ol className="mt-4 space-y-3 border-t border-border pt-4">
      {steps.map((step, i) => {
        const done = step.done ?? Boolean(step.at);
        return (
          <motion.li
            key={step.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2 }}
            className="flex items-start gap-3"
          >
            {done ? (
              <CircleCheck size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-success" />
            ) : (
              <Circle size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>{step.label}</p>
              <p className="text-xs text-muted-foreground">
                {done ? (step.at ? formatTime(step.at) : "Done") : "Pending"}
              </p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ── Stat tile for the home tab ── */
function StatTile({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ComponentType<{ size?: number }>; color: string;
}) {
  return (
    <motion.div variants={item}>
      <Card className="p-4">
        <div className="flex items-center gap-2.5">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary ${color}`}>
            <Icon size={17} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl font-bold leading-none tabular-nums">{value}</p>
            <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ── Quick action card ── */
function QuickAction({ icon: Icon, title, subtitle, onClick, accent = false }: {
  icon: React.ComponentType<{ size?: number }>; title: string; subtitle: string; onClick: () => void; accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/20 hover:bg-secondary"
    >
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-md ${
        accent ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
      }`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </button>
  );
}


/* Bottom navigation tabs */
const tabs = [{ name: "Home", icon: House }, { name: "Packages", icon: Package }, { name: "Schedule", icon: CalendarDays }, { name: "Pickups", icon: History }, { name: "Profile", icon: UserRound }] as const;

export function ResidentHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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

  const recentPickups = useMemo<PickupReceipt[]>(() => {
    const byPackage = new Map(packages.map((p) => [p.id, p]));
    const fromAppointments = appointments
      .filter((a) => a.status === "completed")
      .map((a) => ({
        key: `appt-${a.id}`,
        packageId: a.package_id,
        carrierName: a.carrier_name || byPackage.get(a.package_id)?.carrier_name || "Package",
        trackingCode: a.tracking_code || byPackage.get(a.package_id)?.tracking_code || "—",
        description: byPackage.get(a.package_id)?.description || "",
        pickedUpAt: a.pickup_start,
      }));
    const covered = new Set(fromAppointments.map((r) => r.packageId));
    const fromPackages = packages
      .filter((p) => p.status === "picked_up" && !covered.has(p.id))
      .map((p) => ({
        key: `pkg-${p.id}`,
        packageId: p.id,
        carrierName: p.carrier_name,
        trackingCode: p.tracking_code,
        description: p.description || "",
        pickedUpAt: p.arrived_at || null,
      }));
    const time = (r: PickupReceipt) => (r.pickedUpAt ? new Date(r.pickedUpAt).getTime() || 0 : 0);
    return [...fromAppointments, ...fromPackages]
      .map(({ packageId: _packageId, ...receipt }) => receipt)
      .sort((a, b) => time(b) - time(a));
  }, [appointments, packages]);

  useEffect(() => {
    if (tab !== "Pickups") return;
    void fetchAppointments();
    void fetchPackages();
  }, [tab, fetchAppointments, fetchPackages]);

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

  /* Sprint 4 — re-evaluate pickup windows as time passes */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const [checkingInId, setCheckingInId] = useState<number | null>(null);
  const [checkInError, setCheckInError] = useState("");

  const handleCheckIn = async (id: number) => {
    setCheckInError("");
    setCheckingInId(id);
    try {
      await checkIn(id);
      await fetchAppointments();
    } catch (error) {
      setCheckInError(
        error instanceof Error ? error.message : "Could not check in."
      );
    } finally {
      setCheckingInId(null);
    }
  };

  /* Active packages = everything except picked_up */
  const activePackages = packages.filter((p) => p.status !== "picked_up");

  return (
    <div className="relative min-h-screen bg-background pb-20">
      {/* App header */}
      <header className="relative z-10 border-b border-border bg-card">
        <div className="relative mx-auto flex h-[60px] max-w-5xl items-center justify-center px-6">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-[27px] font-bold leading-none text-primary"
          >
            Red-E Now
          </motion.span>
          <div className="absolute right-6 flex items-center gap-1.5">
            <ThemeTabs compact />
            <Button
              variant="ghost"
              size="sm"
              className="size-10 rounded-md p-0"
              aria-label="Open profile"
              onClick={() => setTab("Profile")}
            >
              <Avatar name={user?.name || "Resident"} />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-10 pt-8">
        {/* Dynamic heading */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mb-8 text-center"
          >
            <h1 className="font-display text-[37px] font-semibold leading-none sm:text-[44px]">
              {tab === "Home" ? (
                <>
                  Welcome back,{" "}
                  <span className="text-primary">
                    {user?.name.split(" ")[0] || "Resident"}
                  </span>
                </>
              ) : tab}
            </h1>
            {tab === "Home" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-3 text-sm text-muted-foreground"
              >
                Here's what's happening at your building.
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} {...fadeUp}>

            {/* ── PROFILE TAB ── */}
            {tab === "Profile" && (
              <div className="mx-auto max-w-md space-y-5">
                {/* Profile header card */}
                <Card className="p-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="rounded-full ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                      <Avatar name={user?.name || "Resident"} />
                    </div>
                    <div>
                      <p className="font-display text-xl font-semibold">{user?.name}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                </Card>

                {/* Theme toggle card */}
                <motion.div variants={item} initial="initial" animate="animate">
                  <Card>
                    <div className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Palette size={17} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Appearance</p>
                          <p className="text-xs text-muted-foreground">Dark, light or red</p>
                        </div>
                      </div>
                      <ThemeTabs />
                    </div>
                  </Card>
                </motion.div>

                {/* Quick stats */}
                <motion.div variants={item} initial="initial" animate="animate" transition={{ delay: 0.1 }}>
                  <Card>
                    <div className="grid grid-cols-3 divide-x divide-border p-5">
                      <div className="text-center">
                        <p className="font-display text-2xl font-bold text-primary">{activePackages.length}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Active</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-2xl font-bold">{upcomingAppointments.length}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Scheduled</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-2xl font-bold">{recentPickups.length}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Sign out */}
                <motion.div variants={item} initial="initial" animate="animate" transition={{ delay: 0.15 }}>
                  <Button
                    variant="secondary"
                    fullWidth
                    className="gap-2"
                    onClick={() => { signOut(); navigate({ to: "/login", replace: true }); }}
                  >
                    <LogOut size={16} /> Sign out
                  </Button>
                </motion.div>
              </div>
            )}

            {tab !== "Profile" && (
              <div className="grid gap-7 md:grid-cols-2">

                {/* ── HOME TAB — stat cards + quick actions ── */}
                {tab === "Home" && (
                  <>
                    {/* Stat cards row */}
                    <motion.div
                      className="md:col-span-2"
                      variants={stagger}
                      initial="initial"
                      animate="animate"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        <StatTile label="Active Packages" value={activePackages.length} icon={Package} color="text-primary" />
                        <StatTile label="Scheduled" value={upcomingAppointments.length} icon={CalendarDays} color="text-blue-400" />
                        <StatTile label="Completed" value={recentPickups.length} icon={CircleCheck} color="text-success" />
                      </div>
                    </motion.div>

                    {/* Your Packages section */}
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-display text-xl font-semibold">Your Packages</h2>
                        <span className="font-mono text-xs text-muted-foreground">
                          <span className="tabular-nums">{String(activePackages.length).padStart(2, "0")}</span>
                        </span>
                      </div>

                      {pkgLoading ? (
                        <Card className="p-8 text-center">
                          <p className="text-sm text-muted-foreground">Loading packages…</p>
                        </Card>
                      ) : activePackages.length > 0 ? (
                        <motion.div className="space-y-3" variants={stagger} initial="initial" animate="animate">
                          {activePackages.slice(0, 3).map((pkg) => (
                            <motion.div key={pkg.id} variants={item}>
                              <PackageCard
                                carrierName={pkg.carrier_name}
                                trackingCode={pkg.tracking_code}
                                status={pkg.status}
                                arrivedAt={pkg.arrived_at}
                                {...(pkg.description ? { description: pkg.description } : {})}
                              />
                            </motion.div>
                          ))}
                          {activePackages.length > 3 && (
                            <motion.div variants={item}>
                              <Button variant="ghost" fullWidth onClick={() => setTab("Packages")} className="text-primary">
                                View all {activePackages.length} packages <ArrowRight size={15} />
                              </Button>
                            </motion.div>
                          )}
                        </motion.div>
                      ) : (
                        <Card hover onClick={() => setTab("Packages")}>
                          <EmptyState icon={Package} message="No packages waiting for you right now" />
                        </Card>
                      )}
                    </section>

                    {/* Upcoming Pickups section */}
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-display text-xl font-semibold">
                          Upcoming Pickups
                        </h2>
                        <span className="font-mono text-xs text-muted-foreground">
                          <span className="tabular-nums">{String(upcomingAppointments.length).padStart(2, "0")}</span>
                        </span>
                      </div>

                      {upcomingAppointments.length ? (
                        <motion.div className="space-y-3" variants={stagger} initial="initial" animate="animate">
                          {upcomingAppointments.map((appointment) => (
                            <motion.div key={appointment.id} variants={item}>
                              <Card className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                    <CalendarDays size={17} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">
                                      {appointment.carrier_name} — {appointment.tracking_code}
                                    </p>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                                      {new Date(appointment.pickup_start).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => beginReschedule(appointment)}
                                    disabled={appointmentBusy}
                                    className="min-h-9 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-secondary disabled:opacity-50"
                                  >
                                    Reschedule
                                  </button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => cancelPickup(appointment.id)}
                                    disabled={appointmentBusy}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </Card>
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : (
                        <Card hover onClick={() => setTab("Schedule")}>
                          <EmptyState
                            icon={Clock3}
                            message="No pickups scheduled — tap to schedule"
                          />
                        </Card>
                      )}
                    </section>

                    {/* Quick actions */}
                    <motion.div
                      className="md:col-span-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <QuickAction
                          icon={CalendarDays}
                          title="Schedule Pickup"
                          subtitle="Book a time slot"
                          onClick={() => setTab("Schedule")}
                          accent
                        />
                        <QuickAction
                          icon={History}
                          title="View Pickups"
                          subtitle="History & receipts"
                          onClick={() => setTab("Pickups")}
                        />
                      </div>
                    </motion.div>
                  </>
                )}

                {/* ── PACKAGES TAB ── */}
                {tab === "Packages" && (
                  <section className="md:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-display text-xl font-semibold">Your Packages</h2>
                      <span className="font-mono text-xs text-muted-foreground">
                        <span className="tabular-nums">{String(activePackages.length).padStart(2, "0")}</span>
                      </span>
                    </div>

                    {pkgLoading ? (
                      <Card className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">Loading packages…</p>
                      </Card>
                    ) : activePackages.length > 0 ? (
                      <motion.div className="space-y-3" variants={stagger} initial="initial" animate="animate">
                        {activePackages.map((pkg) => (
                          <motion.div key={pkg.id} variants={item}>
                            <PackageCard
                              carrierName={pkg.carrier_name}
                              trackingCode={pkg.tracking_code}
                              status={pkg.status}
                              arrivedAt={pkg.arrived_at}
                              {...(pkg.description ? { description: pkg.description } : {})}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <Card>
                        <EmptyState icon={Package} message="No packages waiting for you right now" />
                      </Card>
                    )}
                  </section>
                )}


                {/* Sprint 3 — Real pickup booking */}
                {tab === "Schedule" && (
                  <section className="space-y-5 md:col-span-2">
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <CalendarDays size={20} />
                        </div>
                        <div>
                          <h2 className="font-display text-xl font-semibold">
                            {reschedulingId !== null ? "Reschedule Pickup" : "Schedule a Package Pickup"}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Choose an available package and a weekday pickup slot.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <label className="text-sm font-medium">
                          Package
                          <select
                            className="mt-2 w-full rounded-md border border-border bg-background p-3 transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
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

                        <label className="text-sm font-medium">
                          Pickup Date
                          <input
                            type="date"
                            className="mt-2 w-full rounded-md border border-border bg-background p-3 transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                            min={new Date().toLocaleDateString("en-CA")}
                            value={bookingDate}
                            onChange={(event) => setBookingDate(event.target.value)}
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Pickup Time
                          <select
                            className="mt-2 w-full rounded-md border border-border bg-background p-3 transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
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

                      {/* Available pickup time slots */}
                      <div className="mt-6 space-y-3">
                        <label className="block text-sm font-medium">
                          Available pickup times
                        </label>
                        {slotsLoading ? (
                          <p className="text-sm text-muted-foreground">
                            Loading available times…
                          </p>
                        ) : pickupSlots.filter((slot) => slot.available).length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No open pickup times for this date. Choose another date.
                          </p>
                        ) : (
                          <motion.div
                            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                            variants={stagger}
                            initial="initial"
                            animate="animate"
                          >
                            {pickupSlots
                              .filter((slot) => slot.available)
                              .map((slot) => {
                                const time = slot.pickup_start.slice(11, 16);
                                const selected = bookingTime === time;
                                return (
                                  <motion.button
                                    key={slot.pickup_start}
                                    type="button"
                                    onClick={() => setBookingTime(time)}
                                    aria-pressed={selected}
                                    variants={item}
                                    className={`min-h-11 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                                      selected
                                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                                        : "border-border bg-card hover:border-primary/20 hover:bg-secondary"
                                    }`}
                                  >
                                    <span className="font-medium">{time}</span>
                                    <span className="block font-mono text-[10px] opacity-70">
                                      {slot.remaining} remaining
                                    </span>
                                  </motion.button>
                                );
                              })}
                          </motion.div>
                        )}
                      </div>

                      {bookingDate && bookingTime && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-4 rounded-md bg-secondary px-4 py-2.5 text-sm text-muted-foreground"
                        >
                          Review: {reschedulingId !== null ? "Change pickup to" : "Book pickup for"}{" "}
                          <span className="font-medium text-foreground">
                            {new Date(`${bookingDate}T${bookingTime}`).toLocaleString()}
                          </span>
                        </motion.p>
                      )}

                      <div className="mt-5 flex items-center gap-3">
                        <Button
                          onClick={bookPickup}
                          disabled={appointmentBusy || (reschedulingId === null && availablePackages.length === 0)}
                        >
                          {appointmentBusy ? "Saving…" : reschedulingId !== null ? "Confirm Reschedule" : "Confirm Pickup"}
                        </Button>

                        {reschedulingId !== null && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setReschedulingId(null);
                              setBookingPackageId("");
                              setAppointmentError("");
                            }}
                          >
                            Cancel Rescheduling
                          </Button>
                        )}
                      </div>

                      {reschedulingId === null && availablePackages.length === 0 && (
                        <p className="mt-3 text-sm text-muted-foreground">
                          You have no available packages to schedule.
                        </p>
                      )}

                      <AnimatePresence>
                        {appointmentError && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            role="alert"
                            className="mt-3 rounded-md bg-destructive/10 px-4 py-2.5 text-sm text-red-500"
                          >
                            {appointmentError}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {appointmentSuccess && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mt-3 rounded-md bg-success/10 px-4 py-2.5 text-sm text-green-500"
                          >
                            {appointmentSuccess}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </Card>

                    <Card className="p-6">
                      <h2 className="font-display text-xl font-semibold">
                        Your Scheduled Pickups
                      </h2>
                      {upcomingAppointments.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No pickups scheduled yet.
                        </p>
                      ) : (
                        <motion.div
                          className="mt-4 space-y-3"
                          variants={stagger}
                          initial="initial"
                          animate="animate"
                        >
                          {upcomingAppointments.map((appointment) => (
                            <motion.div
                              key={appointment.id}
                              variants={item}
                              className="rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                  <CalendarDays size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">
                                    {appointment.carrier_name} — {appointment.tracking_code}
                                  </p>
                                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                                    {new Date(appointment.pickup_start).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-3 text-muted-foreground hover:text-destructive"
                                onClick={() => cancelPickup(appointment.id)}
                                disabled={appointmentBusy}
                              >
                                Cancel Pickup
                              </Button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </Card>
                  </section>
                )}

                {/* ── PICKUPS tab ── */}
                {tab === "Pickups" && (
                  <section className="space-y-8 md:col-span-2">
                    <div>
                      <h2 className="mb-3 font-display text-xl font-semibold">Scheduled Pickups</h2>
                      {upcomingAppointments.length > 0 ? (
                        <motion.div
                          className="space-y-3"
                          variants={stagger}
                          initial="initial"
                          animate="animate"
                        >
                          <AnimatePresence>
                            {checkInError && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                role="alert"
                                className="rounded-md bg-destructive/10 px-4 py-2.5 text-sm text-red-500"
                              >
                                {checkInError}
                              </motion.p>
                            )}
                          </AnimatePresence>
                          {upcomingAppointments.map((appointment) => {
                            const prepared = appointment.package_status === "prepared";
                            const start = new Date(appointment.pickup_start).getTime();
                            const end = new Date(appointment.pickup_end).getTime();
                            const checkedIn = Boolean(appointment.checked_in_at);
                            return (
                              <motion.div key={appointment.id} variants={item}>
                                <Card className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                      <CalendarDays size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium">
                                        {appointment.carrier_name} — {appointment.tracking_code}
                                      </p>
                                      <p className="font-mono text-xs text-muted-foreground">
                                        {new Date(appointment.pickup_start).toLocaleString()}
                                      </p>
                                    </div>
                                    {prepared && <StatusBadge status="prepared" />}
                                  </div>

                                  {prepared && checkedIn && <HandoffTracker appointment={appointment} />}

                                  {prepared && !checkedIn && now < start && (
                                    <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
                                      <Clock3 size={14} />
                                      Check-in opens at {new Date(appointment.pickup_start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                    </p>
                                  )}

                                  {prepared && !checkedIn && now >= start && now <= end && (
                                    <div className="mt-3 border-t border-border pt-3">
                                      <Button
                                        size="lg"
                                        fullWidth
                                        onClick={() => handleCheckIn(appointment.id)}
                                        disabled={checkingInId !== null}
                                      >
                                        <LogIn size={18} strokeWidth={1.8} />
                                        {checkingInId === appointment.id ? "Checking in…" : "Check In"}
                                      </Button>
                                      <p className="mt-2 text-center text-xs text-muted-foreground">
                                        You can check in during your pickup window.
                                      </p>
                                    </div>
                                  )}

                                  {prepared && !checkedIn && now > end && (
                                    <p className="mt-3 border-t border-border pt-3 text-sm text-red-500">
                                      Pickup window has passed
                                    </p>
                                  )}
                                </Card>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      ) : (
                        <Card>
                          <EmptyState
                            icon={CalendarDays}
                            message="No pickups scheduled"
                            action={<Button variant="secondary" onClick={() => setTab("Schedule")}>Schedule a pickup</Button>}
                          />
                        </Card>
                      )}
                    </div>

                    <div>
                      <h2 className="mb-3 font-display text-xl font-semibold">Recent Pickups</h2>
                      {recentPickups.length > 0 ? (
                        <motion.div
                          className="grid gap-3 md:grid-cols-2"
                          variants={stagger}
                          initial="initial"
                          animate="animate"
                        >
                          {recentPickups.map((receipt) => (
                            <PickupReceiptCard
                              key={receipt.key}
                              receipt={receipt}
                            />
                          ))}
                        </motion.div>
                      ) : (
                        <Card>
                          <EmptyState icon={History} message={pkgLoading ? "Loading pickups…" : "No pickups yet"} />
                        </Card>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}

            {tab === "Home" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-9 border-t border-border pt-6"
              >
                <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Red-E Now / Your residence, simplified</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed bottom tab navigation */}
      <TabBar items={tabs} activeTab={tab} onTabChange={setTab as (name: string) => void} />
    </div>
  );
}
