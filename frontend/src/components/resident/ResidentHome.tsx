/**
 * ResidentHome — layout shell for the resident app.
 *
 * Data loads through useResidentData; booking flows through useBooking.
 * Each tab is a focused component under resident/.
 */
import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, History, House, Package, UserRound } from "lucide-react";
import type { PickupAppointment } from "@/api/appointmentsApi";
import { Avatar, Button, ConfirmPrompt } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { HomeTab } from "./HomeTab";
import { PackagesTab } from "./PackagesTab";
import { PickupsTab } from "./PickupsTab";
import { ProfileTab } from "./ProfileTab";
import { ScheduleTab } from "./ScheduleTab";
import { ResidentNav, focusRing } from "./ui";
import { useBooking } from "./useBooking";
import { useResidentData } from "./useResidentData";

const tabs = [
  { name: "Home", icon: House },
  { name: "Packages", icon: Package },
  { name: "Schedule", icon: CalendarDays },
  { name: "Pickups", icon: History },
  { name: "Profile", icon: UserRound },
] as const;

type TabName = (typeof tabs)[number]["name"];

export function ResidentHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabName>("Home");

  const data = useResidentData();
  const booking = useBooking(data);

  const firstName = user?.name?.split(/\s+/)[0] || "Resident";
  const buildingName = data.settings?.building_name;

  const openBook = useCallback(() => {
    booking.beginBooking();
    setTab("Schedule");
  }, [booking]);

  const openReschedule = useCallback(
    (appointment: PickupAppointment) => {
      booking.beginReschedule(appointment);
      setTab("Schedule");
    },
    [booking],
  );

  const handleSignOut = useCallback(() => {
    signOut();
    void navigate({ to: "/login" });
  }, [navigate, signOut]);

  const cancelTarget = booking.cancelTarget;
  const cancelLabel = cancelTarget
    ? `${cancelTarget.carrier_name ?? "Package"}${cancelTarget.tracking_code ? ` · ${cancelTarget.tracking_code}` : ""}`
    : "";

  return (
    <div className="relative min-h-dvh bg-background/80 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]">
      {/* Resident-only scrim so cards stay readable over the shared metal backdrop. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-background/55 via-background/75 to-background/90"
      />

      <div className="relative z-[1]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-card/90 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
          <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4 sm:max-w-5xl sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold leading-none tracking-[-0.02em] text-primary">
                Red-E Now
              </p>
              <p className="mt-1 truncate text-[12px] text-muted-foreground">
                {firstName}
                {buildingName ? ` · ${buildingName}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn("size-11 rounded-full p-0", focusRing)}
              aria-label="Open profile"
              onClick={() => setTab("Profile")}
            >
              <Avatar name={user?.name || "Resident"} />
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 pb-8 pt-5 sm:max-w-5xl sm:px-6 sm:pt-7">
          <div key={tab} className="animate-fade-in">
            {tab === "Home" && (
              <HomeTab
                data={data}
                booking={booking}
                firstName={firstName}
                onBook={openBook}
                onReschedule={openReschedule}
                onOpenPackages={() => setTab("Packages")}
                onOpenPickups={() => setTab("Pickups")}
              />
            )}
            {tab === "Packages" && (
              <PackagesTab
                data={data}
                onBook={openBook}
                onOpenPickups={() => setTab("Pickups")}
              />
            )}
            {tab === "Schedule" && (
              <ScheduleTab data={data} booking={booking} onReschedule={openReschedule} />
            )}
            {tab === "Pickups" && (
              <PickupsTab
                data={data}
                booking={booking}
                onBook={openBook}
                onReschedule={openReschedule}
              />
            )}
            {tab === "Profile" && (
              <ProfileTab user={user} buildingName={buildingName} onSignOut={handleSignOut} />
            )}
          </div>
        </main>

        <ResidentNav items={tabs} activeTab={tab} onTabChange={(name) => setTab(name as TabName)} />
      </div>

      {cancelTarget && (
        <ConfirmPrompt
          title="Cancel pickup"
          message={`Cancel the pickup for ${cancelLabel}? The time slot will open for others. You can book again anytime.`}
          confirmLabel="Cancel pickup"
          cancelLabel="Keep pickup"
          loading={booking.busy}
          onConfirm={() => void booking.confirmCancel()}
          onCancel={booking.dismissCancel}
        />
      )}
    </div>
  );
}
