/**
 * Resident-only UI primitives. Kept here so staff and the landing page never
 * pick up these styles. Tokens only — no hardcoded theme colours.
 */
import { useState } from "react";
import { Check, Copy, type LucideIcon, Search, X } from "lucide-react";
import type { PackageRecord, PackageStatus } from "@/api/packagesApi";
import { Button, Card, formatArrived } from "@/components/common";
import { cn } from "@/lib/utils";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const statusTone: Record<PackageStatus, string> = {
  received: "tint-info text-info-foreground",
  available: "tint-success text-success-foreground",
  scheduled: "tint-warning text-warning-foreground",
  prepared: "tint-prepared text-prepared-foreground",
  picked_up: "bg-muted text-muted-foreground",
};

const statusLabel: Record<PackageStatus, string> = {
  received: "Received",
  available: "Available",
  scheduled: "Scheduled",
  prepared: "Prepared",
  picked_up: "Picked up",
};

/** Status pill with colour and readable text (never colour alone). */
export function ResidentStatus({ status }: { status: PackageStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        statusTone[status],
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

/** Bottom tab bar for the resident app only. */
export function ResidentNav({
  items,
  activeTab,
  onTabChange,
}: {
  items: readonly { name: string; icon: LucideIcon }[];
  activeTab: string;
  onTabChange: (name: string) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + items.length) % items.length;
    else return;
    e.preventDefault();
    const nextItem = items[next];
    if (!nextItem) return;
    onTabChange(nextItem.name);
    (e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
  };

  return (
    <nav
      aria-label="Resident tabs"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div
        role="tablist"
        className="mx-auto grid h-14 max-w-lg px-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item, i) => {
          const active = activeTab === item.name;
          return (
            <button
              key={item.name}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(item.name)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={cn(
                "relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-none border-none bg-transparent px-1 text-[10px] font-medium tracking-[-0.01em] transition-colors",
                focusRing,
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-0 h-0.5 w-7 -translate-x-1/2 rounded-full bg-primary"
                />
              )}
              <item.icon size={20} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Compact search field for client-side filtering. */
export function ResidentSearch({
  value,
  onChange,
  placeholder = "Search packages",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-11 w-full rounded-xl border border-input bg-card pl-9 pr-9 text-[15px] text-foreground outline-none transition-[border-color] placeholder:text-muted-foreground hover:border-muted-foreground/40 focus:border-muted-foreground/60",
          focusRing,
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className={cn(
            "absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            focusRing,
          )}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Horizontal filter chips with optional counts. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter packages"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              focusRing,
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Four-cell overview strip for Home. */
export function CountStrip({
  items,
}: {
  items: readonly { label: string; value: number }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((entry) => (
        <div
          key={entry.label}
          className="rounded-xl border border-border bg-card/90 px-3.5 py-3"
        >
          <dt className="text-[11px] font-medium text-muted-foreground">{entry.label}</dt>
          <dd className="mt-1.5 font-mono text-2xl font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type PackageAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

/** Resident package row with status, note, optional copy and action. */
export function PackageRow({
  pkg,
  note,
  action,
}: {
  pkg: PackageRecord;
  note?: string;
  action?: PackageAction;
}) {
  const [copied, setCopied] = useState(false);

  const copyTracking = async () => {
    if (!pkg.tracking_code || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(pkg.tracking_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be denied */
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              {pkg.carrier_name}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 truncate font-mono text-[13px] text-foreground/90">
                {pkg.tracking_code}
              </p>
              {pkg.tracking_code && (
                <button
                  type="button"
                  onClick={() => void copyTracking()}
                  aria-label={copied ? "Tracking number copied" : "Copy tracking number"}
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                    focusRing,
                  )}
                >
                  {copied ? (
                    <Check size={14} aria-hidden="true" className="text-success-foreground" />
                  ) : (
                    <Copy size={14} aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </div>
          <ResidentStatus status={pkg.status} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {pkg.description ? <>{pkg.description} · </> : null}
          Arrived {formatArrived(pkg.arrived_at)}
        </p>
        {note && <p className="mt-2 text-sm leading-snug text-muted-foreground">{note}</p>}
      </div>
      {action && (
        <div className="border-t border-border px-4 py-3">
          <Button
            variant={action.variant ?? "secondary"}
            className="h-11 w-full sm:h-10"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </Card>
  );
}
