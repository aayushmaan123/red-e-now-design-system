/**
 * StaffOverview — the front desk at a glance: four live counts, who is waiting
 * at the desk, what is still due today, and the newest arrivals.
 * Every number is derived from the packages and appointments loaded in StaffContext.
 */
import { ClipboardList, History, Inbox, Package, PackageCheck, PackagePlus } from "lucide-react";
import { Button, EmptyState, KpiStrip, StatCard, StatusBadge, formatArrived } from "@/components/common";
import type { PackageStatus } from "@/api/packagesApi";
import { cn } from "@/lib/utils";
import { BuildingName, useStaff } from "./StaffContext";
import { handoffStage } from "./StaffTypes";
import { formatTime, greeting, plural } from "./format";
import {
  ErrorNote, ExceptionBadge, HandoffBadge, LoadError, LoadingRows, Mono, PageHeader, Panel, PanelHeader, focusRing,
} from "./ui";

const SCHEDULE_ROWS = 6;
const ARRIVAL_ROWS = 7;

export function StaffOverview() {
  const {
    user, date, choose, setDrawerPkg, hasException,
    allPackages, packagesLoaded, packagesError, loading, fetchPackages,
    todaysAppointments, todaysPickups, prepQueue, checkedInAppointments, completedToday,
    appointmentsLoaded, appointmentsError, appointmentsLoading, fetchAppointments,
  } = useStaff();

  const waiting = allPackages.filter((p) => p.status === "received" || p.status === "available").length;
  const schedule = todaysPickups.filter((a) => a.status !== "completed");
  const atDesk = checkedInAppointments.length;

  const count = (ready: boolean, value: number) => (ready ? value : "—");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={<>{greeting(user?.name)}. {date} at <BuildingName />.</>}
        actions={
          <Button size="sm" onClick={() => choose("Register Package")}>
            <PackagePlus size={15} aria-hidden="true" /> Register package
          </Button>
        }
      />

      {packagesLoaded && packagesError && (
        <ErrorNote className="mb-4" onRetry={fetchPackages}>Packages could not be refreshed: {packagesError}</ErrorNote>
      )}
      {appointmentsLoaded && appointmentsError && (
        <ErrorNote className="mb-4" onRetry={fetchAppointments}>Pickups could not be refreshed: {appointmentsError}</ErrorNote>
      )}

      {atDesk > 0 && (
        <Panel className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <p className="flex min-w-0 items-center gap-2.5 text-sm">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
            <span>
              <span className="font-medium">{plural(atDesk, "resident")} waiting at the desk.</span>{" "}
              <span className="text-muted-foreground">
                {checkedInAppointments.slice(0, 3).map((a) => a.resident_name).filter(Boolean).join(", ")}
                {atDesk > 3 ? ` and ${atDesk - 3} more` : ""}
              </span>
            </span>
          </p>
          <Button size="sm" onClick={() => choose("Handoff")}>Open handoff</Button>
        </Panel>
      )}

      <KpiStrip className="rounded-md">
        <StatCard variant="strip" icon={Package} label="Waiting packages" value={count(packagesLoaded, waiting)} />
        <StatCard variant="strip" icon={ClipboardList} label="Pickups left today" value={count(appointmentsLoaded, todaysAppointments.length)} />
        <StatCard variant="strip" icon={PackageCheck} label="To prepare" value={count(appointmentsLoaded, prepQueue.length)} />
        <StatCard variant="strip" icon={History} label="Completed today" value={count(appointmentsLoaded, completedToday.length)} />
      </KpiStrip>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Today's schedule */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Today's schedule"
            meta={appointmentsLoaded ? schedule.length : undefined}
            action={<Button variant="ghost" size="sm" onClick={() => choose("Today's Pickups")}>View all</Button>}
          />
          {!appointmentsLoaded && appointmentsError ? (
            <LoadError title="Could not load today's pickups" message={appointmentsError} onRetry={fetchAppointments} busy={appointmentsLoading} />
          ) : !appointmentsLoaded ? (
            <LoadingRows label="Loading today's pickups" />
          ) : schedule.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nothing left today"
              message={completedToday.length > 0
                ? `All of today's pickups are done (${completedToday.length} completed).`
                : "No pickups are booked for the rest of today."}
            />
          ) : (
            <ul className="divide-y divide-border">
              {schedule.slice(0, SCHEDULE_ROWS).map((a) => {
                const stage = handoffStage(a);
                return (
                  <li key={a.id} className="flex items-center gap-4 px-4 py-2.5">
                    <Mono className="w-[68px] shrink-0 text-[13px] text-foreground">{formatTime(a.pickup_start)}</Mono>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {a.resident_name}
                        <Mono className="ml-2 font-normal text-muted-foreground">{a.resident_unit || "—"}</Mono>
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {a.carrier_name} <Mono>{a.tracking_code}</Mono>
                      </p>
                    </div>
                    <Mono className="hidden shrink-0 text-muted-foreground sm:block">{a.location_code || "No location"}</Mono>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                      {hasException(a) && <ExceptionBadge />}
                      {stage === "Not checked in"
                        ? a.package_status && <StatusBadge status={a.package_status as PackageStatus} />
                        : <HandoffBadge stage={stage} />}
                    </div>
                  </li>
                );
              })}
              {schedule.length > SCHEDULE_ROWS && (
                <li className="px-4 py-2.5 text-[13px] text-muted-foreground">
                  {schedule.length - SCHEDULE_ROWS} more later today
                </li>
              )}
            </ul>
          )}
        </Panel>

        {/* Latest arrivals */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Latest arrivals"
            meta={packagesLoaded ? allPackages.length : undefined}
            action={<Button variant="ghost" size="sm" onClick={() => choose("Packages")}>View all</Button>}
          />
          {!packagesLoaded && packagesError ? (
            <LoadError title="Could not load packages" message={packagesError} onRetry={fetchPackages} busy={loading} />
          ) : !packagesLoaded ? (
            <LoadingRows label="Loading packages" />
          ) : allPackages.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No packages yet"
              message="Packages appear here as soon as they are registered."
              action={<Button size="sm" onClick={() => choose("Register Package")}>Register package</Button>}
            />
          ) : (
            <ul className="divide-y divide-border">
              {allPackages.slice(0, ARRIVAL_ROWS).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setDrawerPkg(p)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted", focusRing, "focus-visible:-outline-offset-2")}
                  >
                    <span className="min-w-0 flex-1">
                      <Mono className="block truncate text-[13px] text-foreground">{p.tracking_code}</Mono>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        {p.carrier_name} · {p.resident_name} · {formatArrived(p.arrived_at)}
                      </span>
                    </span>
                    <StatusBadge status={p.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
