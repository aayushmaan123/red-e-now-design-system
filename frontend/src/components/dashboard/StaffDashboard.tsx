/**
 * StaffDashboard — thin layout shell.
 *
 * All state lives in StaffProvider (staff/StaffContext).
 * Each section is a focused component under staff/.
 */
import { ConfirmPrompt } from "@/components/common";
import {
  StaffProvider,
  useStaff,
  StaffSidebar,
  StaffHeader,
  StaffOverview,
  StaffRegisterPackage,
  StaffPackages,
  StaffPrepQueue,
  StaffPickups,
  StaffHandoff,
  StaffHistory,
  StaffPickupSettings,
  StaffAccount,
  StaffResidents,
  StaffPackageDrawer,
} from "./staff";

/* ── Section router ── */
function SectionContent() {
  const { section } = useStaff();

  switch (section) {
    case "Dashboard":
      return <StaffOverview />;
    case "Register Package":
      return <StaffRegisterPackage />;
    case "Packages":
      return <StaffPackages />;
    case "Preparation Queue":
      return <StaffPrepQueue />;
    case "Today's Pickups":
    case "Upcoming":
      return <StaffPickups />;
    case "Handoff":
      return <StaffHandoff />;
    case "History":
      return <StaffHistory />;
    case "Pickup Settings":
      return <StaffPickupSettings />;
    case "Residents":
      return <StaffResidents />;
    case "Account":
      return <StaffAccount />;
    default:
      return <StaffFallback />;
  }
}

/* ── Fallback for unbuilt sections ── */
function StaffFallback() {
  const { section } = useStaff();
  return (
    <div className="mb-7 animate-fade-in">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Oakwood Residences / Management
      </p>
      <h1 className="font-display text-[38px] font-semibold leading-none">
        {section}
      </h1>
      <p className="mt-6 text-sm text-muted-foreground">Nothing here yet.</p>
    </div>
  );
}

/* ── Handoff confirmation modal ── */
function HandoffConfirm() {
  const { handoffTarget, setHandoffTarget, handoffBusyId, handleCompleteHandoff } =
    useStaff();

  if (!handoffTarget) return null;

  return (
    <ConfirmPrompt
      title="Complete Pickup"
      message={`Hand ${handoffTarget.carrier_name} package ${handoffTarget.tracking_code} from ${handoffTarget.location_code || "storage"} to ${handoffTarget.recipient_name || handoffTarget.resident_name} (Unit ${handoffTarget.resident_unit || "—"})? This can't be undone.`}
      confirmLabel="Complete Pickup"
      variant="primary"
      loading={handoffBusyId === handoffTarget.id}
      onConfirm={handleCompleteHandoff}
      onCancel={() => {
        if (handoffBusyId !== handoffTarget.id) setHandoffTarget(null);
      }}
    />
  );
}

/* ── Layout shell ── */
function StaffLayout() {
  return (
    <div className="min-h-screen bg-background lg:pl-[252px]">
      <StaffSidebar />
      <StaffHeader />

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-9 lg:px-10 lg:pt-12">
        <SectionContent />
      </main>

      <HandoffConfirm />
      <StaffPackageDrawer />
    </div>
  );
}

/* ── Exported default ── */
export default function StaffDashboard() {
  return (
    <StaffProvider>
      <StaffLayout />
    </StaffProvider>
  );
}
