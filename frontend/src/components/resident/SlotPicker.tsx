/**
 * SlotPicker — the open pickup times the API returned for one day, grouped
 * into morning, afternoon and evening. Times are shown in the viewer's own
 * 12-hour or 24-hour format with the remaining capacity.
 */
import type { PickupSlot } from "@/api/schedulingApi";
import { Button } from "@/components/common";
import { cn } from "@/lib/utils";
import { Notice } from "./parts";
import { dayPeriod, formatTime, type DayPeriod } from "./time";

const PERIODS: DayPeriod[] = ["Morning", "Afternoon", "Evening"];

export function SlotPicker({ slots, loading, error, onRetry, time, currentStart, nothingAhead, onChoose }: {
  slots: PickupSlot[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  /** Selected time as "HH:MM" ("" when none). */
  time: string;
  /** While moving a booking: its current slot start, which cannot be picked again. */
  currentStart?: string | undefined;
  /** The first load found no open time today or in the days ahead. */
  nothingAhead: boolean;
  onChoose: (time: string) => void;
}) {
  if (loading) {
    return <p role="status" className="py-2 text-sm text-muted-foreground">Loading available times…</p>;
  }
  if (error) {
    return (
      <Notice kind="error" action={<Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 text-foreground" onClick={onRetry}>Try again</Button>}>
        {error}
      </Notice>
    );
  }

  const open = slots.filter((slot) => slot.available);
  if (open.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        {nothingAhead
          ? "No open pickup times in the next 7 days. Choose a later date."
          : "No open pickup times on this day. Choose another day."}
      </p>
    );
  }
  const taken = slots.length - open.length;

  return (
    <div className="space-y-4">
      {PERIODS.map((period) => {
        const inPeriod = open.filter((slot) => dayPeriod(slot.pickup_start) === period);
        if (inPeriod.length === 0) return null;
        return (
          <div key={period} role="group" aria-label={`${period} times`}>
            <p aria-hidden="true" className="mb-2 text-xs font-medium text-muted-foreground">{period}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
              {inPeriod.map((slot) => {
                const value = slot.pickup_start.slice(11, 16);
                const selected = time === value;
                const current = currentStart !== undefined && slot.pickup_start.slice(0, 16) === currentStart.slice(0, 16);
                return (
                  <button
                    key={slot.pickup_start}
                    type="button"
                    data-time={value}
                    aria-pressed={selected}
                    disabled={current}
                    onClick={() => onChoose(value)}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md border px-1 transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : current
                          ? "cursor-not-allowed border-dashed border-border-strong text-muted-foreground"
                          : "border-input bg-card text-foreground hover:border-muted-foreground/50 hover:bg-muted",
                    )}
                  >
                    <span className="font-mono text-sm font-medium tabular-nums">{formatTime(slot.pickup_start)}</span>
                    <span className={cn("text-[11px]", selected ? "text-background/80" : "text-muted-foreground")}>
                      {current ? "Current time" : `${slot.remaining} remaining`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {taken > 0 && (
        <p className="text-xs text-muted-foreground">
          {taken === 1 ? "1 other time on this day is no longer available." : `${taken} other times on this day are no longer available.`}
        </p>
      )}
    </div>
  );
}
