/**
 * StaffPickupSettings — configure pickup hours and capacity.
 */
import { useId } from "react";
import { Button } from "@/components/common";
import { BuildingName, useStaff } from "./StaffContext";
import { ErrorNote, LoadError, LoadingRows, PageHeader, Panel, SuccessNote, controlClass } from "./ui";

export function StaffPickupSettings() {
  const {
    schedulingSettings, setSchedulingSettings,
    settingsLoading, settingsLoadError, loadSchedulingSettings,
    settingsBusy, settingsSaved, settingsError, saveSchedulingSettings,
  } = useStaff();

  const openId = useId();
  const closeId = useId();
  const slotId = useId();
  const capacityId = useId();
  const cutoffId = useId();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickup settings"
        description={<>Hours and slot capacity for <BuildingName />.</>}
      />

      {settingsLoadError && !schedulingSettings && (
        <LoadError
          title="Could not load pickup settings"
          message={settingsLoadError}
          onRetry={loadSchedulingSettings}
          busy={settingsLoading}
        />
      )}

      {settingsLoading && !schedulingSettings && !settingsLoadError && (
        <Panel>
          <LoadingRows rows={3} label="Loading pickup settings" />
        </Panel>
      )}

      {schedulingSettings && (
        <Panel className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["open_time", "Opening time", openId],
              ["close_time", "Closing time", closeId],
            ] as const).map(([field, label, id]) => (
              <div key={field} className="space-y-2 text-sm">
                <label htmlFor={id} className="block font-medium">{label}</label>
                <input
                  id={id}
                  type="time"
                  value={schedulingSettings[field]}
                  onChange={(event) =>
                    setSchedulingSettings({
                      ...schedulingSettings,
                      [field]: event.target.value,
                    })
                  }
                  className={controlClass}
                />
              </div>
            ))}

            <div className="space-y-2 text-sm">
              <label htmlFor={slotId} className="block font-medium">Slot duration</label>
              <select
                id={slotId}
                value={schedulingSettings.slot_minutes}
                onChange={(event) =>
                  setSchedulingSettings({
                    ...schedulingSettings,
                    slot_minutes: Number(event.target.value),
                  })
                }
                className={controlClass}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div className="space-y-2 text-sm">
              <label htmlFor={capacityId} className="block font-medium">Default slot capacity</label>
              <input
                id={capacityId}
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
                className={controlClass}
              />
            </div>

            <div className="space-y-2 text-sm sm:col-span-2">
              <label htmlFor={cutoffId} className="block font-medium">
                Cancellation cutoff (minutes before pickup)
              </label>
              <input
                id={cutoffId}
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
                className={controlClass}
              />
            </div>
          </div>

          <Button onClick={saveSchedulingSettings} disabled={settingsBusy} aria-busy={settingsBusy}>
            {settingsBusy ? "Saving…" : "Save scheduling settings"}
          </Button>
        </Panel>
      )}

      {settingsError && (
        <ErrorNote onRetry={saveSchedulingSettings}>{settingsError}</ErrorNote>
      )}
      {settingsSaved && !settingsError && (
        <SuccessNote>Scheduling settings saved.</SuccessNote>
      )}
    </div>
  );
}