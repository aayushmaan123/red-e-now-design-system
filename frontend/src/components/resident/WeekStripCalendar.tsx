/**
 * WeekStripCalendar — an interactive week-based calendar for scheduling pickups.
 * Shows a horizontal strip of 7 days with week navigation. Selecting a day
 * expands a detail card below showing available time slots. Designed to be
 * pluggable: the parent passes schedule data and handles slot selection via
 * callbacks. The component itself holds no backend logic.
 */

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Clock3, Package } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  format,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button, Card, EmptyState } from "@/components/common";

/* ── Pluggable types — backend team will supply real data matching these shapes ── */

/** A single bookable time window within a day */
export type TimeSlot = {
  id: string;
  time: string;        // "2:00 PM – 2:30 PM"
  available: boolean;
};

/** All slots for one calendar day, with an optional package count badge */
export type DaySchedule = {
  date: Date;
  slots: TimeSlot[];
  packageCount?: number;
};

/** Props accepted by WeekStripCalendar */
type WeekStripCalendarProps = {
  /** Supply day data from backend; omit for empty placeholder */
  schedules?: DaySchedule[];
  /** Called when the user picks a time slot */
  onSlotSelect?: (date: Date, slot: TimeSlot) => void;
  /** Which slot id is currently selected */
  selectedSlotId?: string;
  className?: string;
};

/* ── Component ── */

export function WeekStripCalendar({
  schedules = [],
  onSlotSelect,
  selectedSlotId,
  className,
}: WeekStripCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);

  const today = useMemo(() => startOfDay(new Date()), []);

  /* Build array of 7 days for the visible week */
  const weekStart = useMemo(
    () => startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 0 }),
    [today, weekOffset],
  );
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 0 }), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  /* Find schedule data for the selected day */
  const selectedSchedule = useMemo(
    () => schedules.find((s) => isSameDay(s.date, selectedDate)),
    [schedules, selectedDate],
  );

  /*
   * Navigate forward/backward by one week.
   * Auto-selects today if it falls within the new week.
   */
  const navigateWeek = useCallback(
    (dir: 1 | -1) => {
      setWeekOffset((prev) => prev + dir);
      const newWeekStart = startOfWeek(
        dir === 1 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1),
        { weekStartsOn: 0 },
      );
      const newWeekEnd = endOfWeek(newWeekStart, { weekStartsOn: 0 });
      if (today >= newWeekStart && today <= newWeekEnd) {
        setSelectedDate(today);
      } else {
        setSelectedDate(newWeekStart);
      }
    },
    [weekStart, today],
  );

  const goToToday = useCallback(() => {
    setWeekOffset(0);
    setSelectedDate(today);
  }, [today]);

  const isPastDay = (day: Date) => isBefore(day, today);

  /* Does a day have any available slots? */
  const dayHasSlots = (day: Date) => {
    const sched = schedules.find((s) => isSameDay(s.date, day));
    return sched && sched.slots.length > 0;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Week navigation header ── */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold uppercase">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="mr-1 text-xs text-primary"
            >
              Today
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="size-9 p-0"
            aria-label="Previous week"
            onClick={() => navigateWeek(-1)}
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="size-9 p-0"
            aria-label="Next week"
            onClick={() => navigateWeek(1)}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      {/* 7-day strip — today gets a ring indicator, days with slots get a dot, past days are dimmed */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const todayMark = isToday(day);
          const past = isPastDay(day);
          const hasSlots = dayHasSlots(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(startOfDay(day))}
              className={cn(
                "group relative flex flex-col items-center gap-0.5 rounded-xl py-2.5 text-center transition-all duration-200",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : past
                    ? "text-muted-foreground/50 hover:bg-secondary/50"
                    : "text-foreground hover:bg-secondary",
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  todayMark && !selected && "ring-2 ring-primary/40",
                )}
              >
                {format(day, "d")}
              </span>
              {/* Dot indicator for days with scheduled slots */}
              {hasSlots && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1.5 rounded-full transition-colors",
                    selected ? "bg-primary-foreground/70" : "bg-primary",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail — shows time slots or appropriate empty/past state */}
      <Card className="animate-fade-in-up p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-semibold uppercase">
              {format(selectedDate, "EEEE")}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {format(selectedDate, "MMMM d, yyyy")}
            </p>
          </div>
          {selectedSchedule && selectedSchedule.packageCount != null && selectedSchedule.packageCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Package size={13} />
              {selectedSchedule.packageCount} package{selectedSchedule.packageCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {isPastDay(selectedDate) ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            This day has passed
          </div>
        ) : !selectedSchedule || selectedSchedule.slots.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            message="No time slots available for this day"
          />
        ) : (
          <div className="grid gap-2">
            {selectedSchedule.slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                disabled={!slot.available}
                onClick={() => onSlotSelect?.(selectedDate, slot)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200",
                  selectedSlotId === slot.id
                    ? "border-primary bg-primary/10 text-foreground shadow-sm"
                    : slot.available
                      ? "border-border bg-card hover:border-primary/30 hover:bg-secondary/50"
                      : "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground line-through",
                )}
              >
                <Clock3
                  size={16}
                  className={cn(
                    "shrink-0",
                    selectedSlotId === slot.id ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="font-medium">{slot.time}</span>
                {!slot.available && (
                  <span className="ml-auto text-xs text-muted-foreground">Full</span>
                )}
                {slot.available && selectedSlotId === slot.id && (
                  <span className="ml-auto text-xs font-medium text-primary">Selected</span>
                )}
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
