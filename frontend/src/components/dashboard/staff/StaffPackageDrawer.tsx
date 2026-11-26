/**
 * StaffPackageDrawer — slide-over detail panel for a single package.
 */
import { useMemo } from "react";
import {
  Button, Drawer, StatusBadge, TextInput, formatArrived,
} from "@/components/common";
import { cn } from "@/lib/utils";
import { describeAudit, type AuditTone } from "./audit";
import { formatDateTime } from "./format";
import { NEXT_STATUS, useStaff } from "./StaffContext";
import { ErrorNote, LoadingRows, Mono } from "./ui";

const toneClass: Record<AuditTone, string> = {
  default: "text-foreground",
  success: "text-success-foreground",
  alert: "text-primary",
};

export function StaffPackageDrawer() {
  const {
    drawerPkg, setDrawerPkg,
    audit, auditLoading, auditError, reloadAudit,
    appointments,
    editMode, setEditMode,
    editCarrier, setEditCarrier,
    editTracking, setEditTracking,
    editDescription, setEditDescription,
    editLocation, setEditLocation,
    editSaving, editError, setEditError,
    editSuccess,
    handleEditSave, handleStatusAdvance,
    statusBusyId, statusError,
  } = useStaff();

  const timeline = useMemo(
    () => (drawerPkg ? describeAudit(audit, appointments) : []),
    [audit, appointments, drawerPkg],
  );

  const busy = drawerPkg ? statusBusyId === drawerPkg.id : false;

  return (
    <Drawer open={!!drawerPkg} onClose={() => setDrawerPkg(null)} title="Package detail">
      {drawerPkg && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={drawerPkg.status} />
            <Mono className="text-muted-foreground">#{drawerPkg.id}</Mono>
          </div>

          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Carrier</dt>
              <dd className="mt-1 font-medium">{drawerPkg.carrier_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Tracking code</dt>
              <dd className="mt-1"><Mono>{drawerPkg.tracking_code}</Mono></dd>
            </div>
            {drawerPkg.description && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Description</dt>
                <dd className="mt-1">{drawerPkg.description}</dd>
              </div>
            )}
            <div className="rounded-md border border-border bg-muted/40 px-3.5 py-3">
              <dt className="text-xs font-medium text-muted-foreground">Resident</dt>
              <dd className="mt-1 font-medium">{drawerPkg.resident_name}</dd>
              {drawerPkg.resident_unit && (
                <dd className="text-muted-foreground">Unit {drawerPkg.resident_unit}</dd>
              )}
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Storage location</dt>
              <dd className="mt-1">{drawerPkg.location_code ? <Mono>{drawerPkg.location_code}</Mono> : "Not assigned"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Arrived</dt>
              <dd className="mt-1">{formatArrived(drawerPkg.arrived_at)}</dd>
            </div>
          </dl>

          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Edit details</h3>
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
                    setEditMode(true);
                  }}
                >
                  Edit package
                </Button>
              )}
            </div>

            {editSuccess && (
              <p role="status" className="mt-3 text-sm text-success">{editSuccess}</p>
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
                  label="Tracking code"
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
                  label="Storage location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  required
                />

                {editError && (
                  <p role="alert" className="text-sm text-primary">{editError}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={editSaving} aria-busy={editSaving}>
                    {editSaving ? "Saving…" : "Save changes"}
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

          {statusError && (
            <ErrorNote>{statusError}</ErrorNote>
          )}

          {NEXT_STATUS[drawerPkg.status] && (
            <Button
              className="w-full"
              onClick={() => handleStatusAdvance(drawerPkg)}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? "Updating…" : NEXT_STATUS[drawerPkg.status]!.label}
            </Button>
          )}

          <div className="border-t border-border pt-5">
            <h3 className="mb-3 text-sm font-semibold">Audit history</h3>
            {auditError && (
              <ErrorNote onRetry={reloadAudit}>Could not load history: {auditError}</ErrorNote>
            )}
            {auditLoading && !auditError && (
              <LoadingRows rows={3} label="Loading audit history" />
            )}
            {!auditLoading && !auditError && timeline.length === 0 && (
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            )}
            {!auditError && timeline.length > 0 && (
              <ol className="space-y-0 divide-y divide-border rounded-md border border-border">
                {timeline.map((line) => (
                  <li key={line.id} className="px-3.5 py-3">
                    <p className={cn("text-sm font-medium", toneClass[line.tone])}>{line.title}</p>
                    {line.detail && (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{line.detail}</p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {line.who}
                      <span aria-hidden="true"> · </span>
                      <Mono>{formatDateTime(line.at)}</Mono>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}