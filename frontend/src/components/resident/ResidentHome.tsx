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
import { Avatar, Button, ConfirmPrompt, TabBar, ThemeTabs } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { HomeTab } from "./HomeTab";
import { PackagesTab } from "./PackagesTab";
import { PickupsTab } from "./PickupsTab";
import { ProfileTab } from "./ProfileTab";
import { ScheduleTab } from "./ScheduleTab";
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
    <div className="relative min-h-screen bg-background/70 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        {/* Flex (not centered absolute controls) so the title and actions do not overlap at ~390px. */}
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <span className="min-w-0 truncate font-display text-xl font-bold leading-none tracking-[-0.02em] text-primary sm:text-[27px]">
            Red-E Now
          </span>
          <div className="flex shrink-0 items-center gap-1">
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

      <main className="mx-auto max-w-5xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
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
          {tab === "Packages" && <PackagesTab data={data} onBook={openBook} />}
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

      <TabBar items={tabs} activeTab={tab} onTabChange={(name) => setTab(name as TabName)} />

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