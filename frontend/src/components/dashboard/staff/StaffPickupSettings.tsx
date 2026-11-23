/**
 * StaffPickupSettings — configure pickup hours and capacity.
 */
import { Card, Button } from "@/components/common";
import { useStaff } from "./StaffContext";

export function StaffPickupSettings() {
  const {
    schedulingSettings, setSchedulingSettings,
    settingsBusy, settingsMessage, saveSchedulingSettings,
  } = useStaff();

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Oakwood Residences / Management
        </p>
        <h2 className="font-display text-[38px] font-semibold uppercase leading-none">
          Pickup Settings
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Configure pickup hours and capacity for the current building.
        </p>
      </div>

      {schedulingSettings ? (
        <Card className="space-y-5 p-5 animate-fade-in bg-card border-border">
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["open_time", "Opening time"],
              ["close_time", "Closing time"],
            ] as const).map(([field, label]) => (
              <label key={field} className="space-y-2 text-sm">
                <span className="block font-medium">{label}</span>
                <input
                  type="time"
                  value={schedulingSettings[field]}
                  onChange={(event) =>
                    setSchedulingSettings({
                      ...schedulingSettings,
                      [field]: event.target.value,
                    })
                  }
                  className="min-h-11 w-full rounded-lg border border-border bg-background px-3 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            ))}

            <label className="space-y-2 text-sm">
              <span className="block font-medium">Slot duration</span>
              <select
                value={schedulingSettings.slot_minutes}
                onChange={(event) =>
                  setSchedulingSettings({
                    ...schedulingSettings,
                    slot_minutes: Number(event.target.value),
                  })
                }
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="block font-medium">Default slot capacity</span>
              <input
                type="number"
                min={1}
                max={100}
                value={schedulingSettings.default_capacity}
                onChange={(event) =>
                  setSchedulingSettings({
                    ...schedulingSettings,
                    default_capacity: Number(event.target.value),
                  })
                }
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="block font-medium">
                Cancellation cutoff (minutes before pickup)
              </span>
              <input
                type="number"
                min={0}
                max={10080}
                value={schedulingSettings.cancellation_cutoff_minutes}
                onChange={(event) =>
                  setSchedulingSettings({
                    ...schedulingSettings,
                    cancellation_cutoff_minutes: Number(event.target.value),
                  })
                }
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <Button onClick={saveSchedulingSettings} disabled={settingsBusy}>
            {settingsBusy ? "Saving..." : "Save Scheduling Settings"}
          </Button>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Loading scheduling settings...</p>
      )}

      {settingsMessage && (
        <p role="status" className="text-sm text-destructive">{settingsMessage}</p>
      )}
    </div>
  );
}
