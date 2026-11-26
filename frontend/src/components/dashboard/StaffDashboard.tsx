/**
 * StaffDashboard — layout shell for the staff console.
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
  StaffCommandMenu,
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
  PageHeader,
  sectionTitle,
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
      return <PageHeader title={sectionTitle(section)} description="This section does not exist." />;
  }
}

/* ── Handoff confirmation ── */
function HandoffConfirm() {
  const { handoffTarget, setHandoffTarget, handoffBusyId, handleCompleteHandoff } =
    useStaff();

  if (!handoffTarget) return null;

  return (
    <ConfirmPrompt
      title="Complete pickup"
      message={`Hand ${handoffTarget.carrier_name} package ${handoffTarget.tracking_code} from ${handoffTarget.location_code || "storage"} to ${handoffTarget.recipient_name || handoffTarget.resident_name} (Unit ${handoffTarget.resident_unit || "—"})? This can't be undone.`}
      confirmLabel="Complete pickup"
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
  const { section } = useStaff();
  return (
    <div className="min-h-screen bg-background lg:pl-[232px]">
      <StaffSidebar />
      <StaffHeader />

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        {/* Keyed so each section fades in once when it is opened. */}
        <div key={section} className="animate-fade-in">
          <SectionContent />
        </div>
      </main>

      <HandoffConfirm />
      <StaffPackageDrawer />
      <StaffCommandMenu />
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
