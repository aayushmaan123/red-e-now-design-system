/**
 * ThemeTabs — Linear-style segmented control for Dark / Light / Red.
 * `compact` hides the text labels (icons stay, with accessible names).
 */
import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

function RedSwatch({ size = 13 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full bg-[#e40000] ring-1 ring-inset ring-white/20"
      style={{ width: size - 2, height: size - 2 }}
    />
  );
}

const OPTIONS: { value: Theme; label: string; icon: (s: number) => ReactNode }[] = [
  { value: "dark", label: "Dark", icon: (s) => <Moon size={s} strokeWidth={1.8} aria-hidden="true" /> },
  { value: "light", label: "Light", icon: (s) => <Sun size={s} strokeWidth={1.8} aria-hidden="true" /> },
  { value: "red", label: "Red", icon: (s) => <RedSwatch size={s} /> },
];

export function ThemeTabs({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5",
        className,
      )}
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={compact ? `${o.label} theme` : undefined}
            onClick={() => setTheme(o.value)}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-1.5 rounded-[5px] text-[13px] font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              compact ? "w-7" : "px-2.5",
              active
                ? "bg-card text-foreground shadow-[0_0_0_1px_var(--border-strong),0_1px_2px_var(--shadow-tone)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon(14)}
            {!compact && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
