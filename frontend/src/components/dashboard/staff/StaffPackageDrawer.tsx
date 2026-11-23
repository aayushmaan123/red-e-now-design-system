/**
 * StaffPackageDrawer — slide-over detail panel for a single package.
 * Includes status badge, carrier/tracking info, resident info, storage
 * location, an inline edit form, audit history and a status-advance button.
 */
import {
  Button, Card, Drawer, StatusBadge, TextInput,
} from "@/components/common";
import { useStaff } from "./StaffContext";
import { NEXT_STATUS } from "./StaffContext";

export function StaffPackageDrawer() {
  const {
    drawerPkg, setDrawerPkg,
    audit, auditError,
    editMode, setEditMode,
    editCarrier, setEditCarrier,
    editTracking, setEditTracking,
    editDescription, setEditDescription,
    editLocation, setEditLocation,
    editSaving, editError, setEditError,
    editSuccess,
    handleEditSave, handleStatusAdvance,
  } = useStaff();

  return (
    <Drawer open={!!drawerPkg} onClose={() => setDrawerPkg(null)} title="Package Detail">
      {drawerPkg && (
        <div className="space-y-6">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <StatusBadge status={drawerPkg.status} />
            <span className="font-mono text-xs text-muted-foreground">
              ID #{drawerPkg.id}
            </span>
          </div>

          {/* Carrier & tracking */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Carrier
            </p>
            <p className="mt-1 text-sm font-medium">{drawerPkg.carrier_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tracking Code
            </p>
            <p className="mt-1 font-mono text-sm">{drawerPkg.tracking_code}</p>
          </div>

          {/* Description */}
          {drawerPkg.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="mt-1 text-sm">{drawerPkg.description}</p>
            </div>
          )}

          {/* Resident info */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Resident
            </p>
            <p className="mt-1 text-sm font-medium">{drawerPkg.resident_name}</p>
            {drawerPkg.resident_unit && (
              <p className="text-sm text-muted-foreground">
                Unit {drawerPkg.resident_unit}
              </p>
            )}
          </div>

          {/* Storage location */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Storage Location
            </p>
            <p className="mt-1 text-sm">
              {drawerPkg.location_code || "Not assigned"}
            </p>
          </div>

          {/* Arrival date */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Arrived
            </p>
            <p className="mt-1 text-sm">{drawerPkg.arrived_at}</p>
          </div>

          {/* Edit form */}
          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Package Details</h3>
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
                  Edit Package
                </Button>
              )}
            </div>

            {editSuccess && (
              <p className="mt-3 text-sm text-success">{editSuccess}</p>
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
                  label="Tracking Code"
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
                  label="Storage Location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  required
                />

                {editError && (
                  <p className="text-sm text-destructive">{editError}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={editSaving}>
                    {editSaving ? "Saving…" : "Save Changes"}
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

          {/* Audit history */}
          <div className="border-t border-border pt-5">
            <h3 className="mb-3 text-sm font-semibold">Audit History</h3>
            {auditError && (
              <p className="text-sm text-destructive">{auditError}</p>
            )}
            {!auditError && audit.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No changes recorded yet.
              </p>
            )}
            <div className="space-y-3">
              {audit.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <p className="text-sm font-medium">
                    {entry.action.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.changed_by_name || `Staff #${entry.changed_by}`}
                    {" · "}
                    {new Date(entry.changed_at).toLocaleString()}
                  </p>
                  {entry.new_values && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(entry.new_values).map(([field, value]) => (
                        <p key={field} className="break-words text-xs">
                          <span className="font-medium">
                            {field.replaceAll("_", " ")}:
                          </span>{" "}
                          {String(value ?? "Not set")}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Status advance */}
          {NEXT_STATUS[drawerPkg.status] && (
            <Button
              className="w-full"
              onClick={() => handleStatusAdvance(drawerPkg)}
            >
              {NEXT_STATUS[drawerPkg.status]!.label}
            </Button>
          )}
        </div>
      )}
    </Drawer>
  );
}
