/**
 * DayPicker — the next seven days as one tap each, plus a native date field
 * for any later day. Days that the API has already reported as having no open
 * times are marked; nothing is assumed about days not asked about yet.
 */
import { useEffect, useState } from "react";
import { TextInput } from "@/components/common";
import { cn } from "@/lib/utils";
import { addDays, formatDayLong, parseWallClock } from "./time";
import { focusRing } from "./ui";

const STRIP_DAYS = 7;

export function DayPicker({ date, today, openByDay, onChoose }: {
  /** Selected day, "YYYY-MM-DD" ("" until the first load settles). */
  date: string;
  /** Today at the building. Earlier days cannot be chosen. */
  today: string;
  openByDay: Record<string, number>;
  onChoose: (day: string) => void;
}) {
  // The field keeps its own text so a half-typed date is not thrown away.
  const [draft, setDraft] = useState(date);
  useEffect(() => { setDraft(date); }, [date]);
  const tooEarly = /^\d{4}-\d{2}-\d{2}$/.test(draft) && draft < today;

  const days = Array.from({ length: STRIP_DAYS }, (_, offset) => addDays(today, offset));

  return (
    <div className="grid gap-4">
      <div role="group" aria-label="Next 7 days" className="grid grid-cols-7 gap-1.5">
        {days.map((day, offset) => {
          const parsed = parseWallClock(day);
          const selected = day === date;
          const closed = openByDay[day] === 0;
          const isToday = offset === 0;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={selected}
              aria-label={`${formatDayLong(day)}${isToday ? ", today" : ""}${closed ? ", no open times" : ""}`}
              onClick={() => onChoose(day)}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors",
                focusRing,
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-border-strong hover:bg-muted/60",
              )}
            >
              <span className={cn("text-[10px] font-medium uppercase tracking-wide", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {isToday ? "Today" : parsed?.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className={cn("font-mono text-[15px] font-semibold tabular-nums", closed && !selected && "text-muted-foreground line-through")}>
                {parsed?.getDate()}
              </span>
              {isToday && !selected && (
                <span aria-hidden="true" className="absolute bottom-1.5 size-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <TextInput
        label="Or pick another date"
        type="date"
        min={today}
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          if (value && value >= today) onChoose(value);
        }}
        onBlur={() => setDraft(date)}
        className="h-11 rounded-xl font-mono"
        {...(tooEarly ? { error: "Choose today or a later day." } : {})}
      />
    </div>
  );
}
