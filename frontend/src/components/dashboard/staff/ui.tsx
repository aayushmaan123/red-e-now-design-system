/**
 * Staff console primitives.
 *
 * Small layout and form pieces used by every staff section. They sit on top of
 * `components/common` (Card, Button, Badge, labelClass) and only add what the
 * shared library does not have yet: a page header, a dense data table with
 * keyboard-sortable headers and built-in loading/empty rows, labelled select
 * and textarea fields, and inline error/notice blocks.
 */
import { useId, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, CircleAlert, CircleCheck, type LucideIcon } from "lucide-react";
import { Badge, Button, Card, labelClass } from "@/components/common";
import { cn } from "@/lib/utils";
import { HANDOFF_TONES, type HandoffStage } from "./StaffTypes";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Shared look of text-like controls (matches TextInput in components/common). */
export const controlClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-[15px] text-foreground outline-none transition-[border-color] placeholder:text-subtle-foreground hover:border-muted-foreground/40 focus:border-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

/* ── Page furniture ── */

/** Section heading: one h1, a one-line summary and right-aligned actions. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold leading-tight tracking-[-0.022em]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Flat 1px-bordered surface with the console's tighter corner radius. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn("rounded-md", className)}>{children}</Card>;
}

/** Title row for a panel or a list: small heading, optional count/meta, optional action. */
export function PanelHeader({ title, meta, action, className }: { title: string; meta?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-3 border-b border-border px-4", className)}>
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="truncate font-display text-sm font-semibold tracking-[-0.011em]">{title}</h2>
        {meta != null && <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{meta}</span>}
      </div>
      {action}
    </div>
  );
}

/** Monospace run for tracking numbers, shelf codes, units and times. */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12.5px] tabular-nums", className)}>{children}</span>;
}

/** Static placeholder bar shown while a list loads (no animation). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block h-3 rounded-sm bg-accent", className)} />;
}

/** Placeholder rows for a list that has not loaded yet. */
export function LoadingRows({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="w-16" />
          <Skeleton className="w-40" />
          <Skeleton className="ml-auto w-24" />
        </div>
      ))}
    </div>
  );
}

/* ── Messages ── */

/**
 * Inline error. Text stays in the foreground colour (red text on a red tint does not
 * reach 4.5:1 in the dark theme); the icon and tint carry the signal.
 */
export function ErrorNote({ children, onRetry, retryLabel = "Try again", className }: { children: ReactNode; onRetry?: () => void; retryLabel?: string; className?: string }) {
  return (
    <div role="alert" className={cn("tint-primary flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md px-3.5 py-2.5 text-sm text-foreground", className)}>
      <CircleAlert size={16} aria-hidden="true" className="shrink-0 text-primary" />
      <span className="min-w-0 flex-1">{children}</span>
      {onRetry && <Button type="button" variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button>}
    </div>
  );
}

/** Inline confirmation ("Package registered."). Announced politely. */
export function SuccessNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="status" className={cn("tint-success flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-sm text-foreground", className)}>
      <CircleCheck size={16} aria-hidden="true" className="shrink-0 text-success-foreground" />
      <span>{children}</span>
    </p>
  );
}

/** A list that failed to load: says what failed, why, and offers a retry. */
export function LoadError({ title, message, onRetry, busy }: { title: string; message: string; onRetry: () => void; busy?: boolean }) {
  return (
    <div role="alert" className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-md border border-border bg-muted text-primary">
        <CircleAlert size={20} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <strong className="mb-1 font-display text-sm font-semibold tracking-[-0.015em] text-foreground">{title}</strong>
      <p className="max-w-[44ch] text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="secondary" size="sm" className="mt-5" onClick={onRetry} disabled={busy}>
        {busy ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}

/* ── Badges ── */

export function HandoffBadge({ stage }: { stage: HandoffStage }) {
  return <Badge tone={HANDOFF_TONES[stage]}>{stage}</Badge>;
}

export function ExceptionBadge() {
  return <Badge tone="alert">Exception</Badge>;
}

/* ── Form fields ── */

function FieldNote({ id, error, helperText }: { id: string; error?: string | undefined; helperText?: string | undefined }) {
  if (!error && !helperText) return null;
  return (
    <p id={`${id}-note`} role={error ? "alert" : undefined} className={cn("text-xs", error ? "text-foreground" : "text-muted-foreground")}>
      {error || helperText}
    </p>
  );
}

/** Labelled native select, styled like TextInput. */
export function SelectField({ label, error, helperText, className, id, children, ...props }: ComponentProps<"select"> & { label: string; error?: string; helperText?: string }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className={cn(labelClass, "block")}>{label}</label>
      <div className="relative">
        <select
          id={fieldId}
          {...props}
          aria-invalid={!!error}
          aria-describedby={error || helperText ? `${fieldId}-note` : undefined}
          className={cn(controlClass, "appearance-none pr-9", className)}
        >
          {children}
        </select>
        <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      <FieldNote id={fieldId} error={error} helperText={helperText} />
    </div>
  );
}

/** Labelled textarea, styled like TextInput. `optional` adds a quiet "(optional)" to the label. */
export function TextAreaField({ label, optional, error, helperText, className, id, ...props }: ComponentProps<"textarea"> & { label: string; optional?: boolean; error?: string; helperText?: string }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className={cn(labelClass, "block")}>
        {label}{optional && <span className="font-normal"> (optional)</span>}
      </label>
      <textarea
        id={fieldId}
        {...props}
        aria-invalid={!!error}
        aria-describedby={error || helperText ? `${fieldId}-note` : undefined}
        className={cn(controlClass, "h-auto min-h-[72px] resize-y py-2 leading-6", className)}
      />
      <FieldNote id={fieldId} error={error} helperText={helperText} />
    </div>
  );
}

/* ── Data table ── */

export type DataColumn<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right";
  /** Applied to the header and every cell, e.g. "hidden md:table-cell" to drop a column on phones. */
  className?: string;
};

/**
 * Dense hairline table: 36px header, 44px rows, mono metadata.
 * Sortable headers are real buttons (keyboard reachable), clickable rows open with
 * Enter or Space, and the body shows its own loading and empty rows.
 * It scrolls sideways inside its own border when the columns do not fit.
 */
export function DataTable<T>({
  caption, columns, data, keyExtractor, sortKey, sortDir, onSort, onRowClick,
  loading, loadingLabel = "Loading…", empty, className,
}: {
  /** Read by screen readers as the table's name. */
  caption: string;
  columns: DataColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortKey?: string | undefined;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  /** Shows placeholder rows while the first load is in flight. */
  loading?: boolean;
  loadingLabel?: string;
  /** Shown in place of rows when there is nothing to list. */
  empty?: ReactNode;
  className?: string;
}) {
  const align = (a?: "left" | "right") => (a === "right" ? "text-right" : "text-left");
  return (
    <div className={cn("overflow-x-auto rounded-md border border-border bg-card", className)}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-muted">
            {columns.map((col) => {
              const active = !!col.sortable && sortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn("h-9 whitespace-nowrap px-4 font-medium", labelClass, align(col.align), col.className)}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={cn(
                        "group -mx-1.5 inline-flex h-7 items-center gap-1 rounded-sm px-1.5 transition-colors hover:text-foreground",
                        focusRing,
                        active && "text-foreground",
                      )}
                    >
                      {col.header}
                      {active
                        ? (sortDir === "asc" ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />)
                        : <ChevronsUpDown size={12} aria-hidden="true" className="opacity-40 group-hover:opacity-80" />}
                    </button>
                  ) : col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-border">
          {loading && data.length === 0 ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={`loading-${i}`} aria-hidden={i > 0 ? true : undefined}>
                {columns.map((col, c) => (
                  <td key={col.key} className={cn("h-11 px-4", col.className)}>
                    {i === 0 && c === 0 ? <span className="sr-only" role="status">{loadingLabel}</span> : null}
                    <Skeleton className={cn(c === 0 ? "w-28" : "w-20", col.align === "right" && "ml-auto")} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-2">{empty ?? <p className="py-8 text-center text-muted-foreground">Nothing to show.</p>}</td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.target !== e.currentTarget) return; // buttons inside the row keep their own keys
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(row); }
                } : undefined}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("h-11 px-4", align(col.align), col.className)}>
                    {col.render ? col.render(row) : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Small pieces ── */

/** Label/value pairs in two tidy columns (package details, account facts). */
export function Facts({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[minmax(96px,auto)_1fr] gap-x-5 gap-y-2.5 text-sm", className)}>
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Quiet icon + text line used for inline hints inside rows. */
export function Hint({ icon: Icon, children, className }: { icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {Icon && <Icon size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />}
      <span>{children}</span>
    </p>
  );
}
