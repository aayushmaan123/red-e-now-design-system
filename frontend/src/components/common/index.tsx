/**
 * Red-E Now Design System v4 ("Bold Dark Ops") — reusable UI component library.
 * All components are exported from this single file to keep imports simple.
 * Each component uses the cn() utility (clsx + tailwind-merge) for class merging
 * and the CSS custom property tokens defined in styles.css. Contract: .claude/DESIGN.md
 */

import { type ComponentProps, type InputHTMLAttributes, type ReactNode, type RefObject, useState, useEffect, useRef, useId } from "react";
import { X, LoaderCircle, Package, Clock3, ChevronUp, ChevronDown, ChevronsUpDown, Search, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** Uppercase micro-label used for column heads, nav groups, form labels and KPI labels. */
export const labelClass = "font-display text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground";

/** Focus ring shared by every interactive control. */
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Shared dialog behaviour for Modal, Drawer and ConfirmPrompt: Escape closes, Tab stays inside the panel,
 * focus moves in on open and returns to the trigger on close, and page scroll is locked while open.
 */
function useDialog<T extends HTMLElement>(open: boolean, onClose: () => void, initialFocus?: RefObject<HTMLElement | null>) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const panel = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const items = () => panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    (initialFocus?.current ?? items()[0] ?? panel)?.focus({ preventScroll: true });

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onCloseRef.current(); return; }
      if (e.key !== "Tab" || !panel) return;
      const list = items();
      const first = list[0], last = list[list.length - 1];
      if (!first || !last) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, initialFocus]);

  return ref;
}

/**
 * Button with 4 variants and 3 sizes (md = the 40px control height).
 * Primary carries the bezel; secondary/ghost/destructive stay flat. Hover changes colour only.
 */
export function Button({ variant = "primary", size = "md", fullWidth, className, children, ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "destructive"; size?: "sm" | "md" | "lg"; fullWidth?: boolean }) {
  return <button {...props} className={cn(
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold tracking-wide transition-[background-color,border-color,color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
    focusRing,
    variant === "primary" && "bg-primary text-primary-foreground shadow-bezel-sm hover:bg-primary-hover active:shadow-none",
    variant === "secondary" && "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-accent",
    variant === "ghost" && "text-muted-foreground hover:bg-muted hover:text-foreground",
    variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
    size === "sm" && "h-8 px-3 text-sm",
    size === "md" && "h-10 px-4 text-[15px]",
    size === "lg" && "h-12 px-5 text-base",
    fullWidth && "w-full",
    className
  )}>{children}</button>;
}

/** Brand wordmark (red mark + name) linking home. */
export function Wordmark({ className }: { className?: string }) {
  return <Link to="/" className={cn("inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring", className)}>
    <span aria-hidden="true" className="size-4 rounded-[3px] bg-primary" />
    <span className="font-display text-lg font-semibold uppercase tracking-[0.02em] text-foreground">Red-E Now</span>
  </Link>;
}

/** Keyboard hint chip, e.g. <Kbd>H</Kbd> inside a button or ⌘K in a search trigger. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-black/25 px-1.5 font-mono text-[11px] font-medium text-current opacity-80", className)}>{children}</kbd>;
}

/** Labeled text input with optional error message and helper text. Auto-generates an accessible id from the label. */
export function TextInput({ label, error, helperText, className, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; helperText?: string }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return <div className="space-y-1.5">
    <label htmlFor={fieldId} className={cn(labelClass, "block")}>{label}</label>
    <input id={fieldId} {...props} aria-invalid={!!error} aria-describedby={error || helperText ? `${fieldId}-note` : undefined} className={cn(
      "h-10 w-full rounded-md border border-input bg-card px-3 text-[15px] text-foreground outline-none transition-[border-color] placeholder:text-subtle-foreground hover:border-muted-foreground/40 focus:border-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
      className
    )} />
    {(error || helperText) && <p id={`${fieldId}-note`} role={error ? "alert" : undefined} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>{error || helperText}</p>}
  </div>;
}

/** Flat content surface (no shadow). When onClick is provided it becomes an interactive button; hover changes the border only. */
export function Card({ children, className, hover = false, onClick }: { children: ReactNode; className?: string; hover?: boolean; onClick?: () => void }) {
  return <div
    onClick={onClick}
    onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    tabIndex={onClick ? 0 : undefined} role={onClick ? "button" : undefined}
    className={cn(
    "rounded-lg border border-border bg-card transition-colors",
    hover && "cursor-pointer hover:border-border-strong hover:bg-muted",
    onClick && focusRing,
    className
  )}>{children}</div>;
}

/** Tone → tint fill + readable text. Red is reserved for "alert" (e.g. overdue). */
const toneStyle = {
  success: "tint-success text-success-foreground",
  warning: "tint-warning text-warning-foreground",
  prepared: "tint-prepared text-prepared-foreground",
  info: "tint-info text-info-foreground",
  alert: "tint-primary text-primary",
  neutral: "bg-muted text-muted-foreground",
} as const;
export type BadgeTone = keyof typeof toneStyle;

/** Generic status pill: 22px, 13% tint, 6px dot, uppercase label. */
export function Badge({ tone = "neutral", children, dot = true, className }: { tone?: BadgeTone; children: ReactNode; dot?: boolean; className?: string }) {
  return <span className={cn(
    "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-sm px-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em]",
    toneStyle[tone],
    className
  )}>
    {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
    {children}
  </span>;
}

/** Color-coded status badge for the 5-stage package flow: received -> available -> scheduled -> prepared -> picked_up. */
const statusTone: Record<"received" | "available" | "scheduled" | "prepared" | "picked_up", BadgeTone> = {
  received: "info",
  available: "success",
  scheduled: "warning",
  prepared: "prepared",
  picked_up: "neutral",
};

export function StatusBadge({ status }: { status: "received" | "available" | "scheduled" | "prepared" | "picked_up" }) {
  return <Badge tone={statusTone[status]}>{status.replace("_", " ")}</Badge>;
}

/** Placeholder shown when a section has no data. Accepts an icon, message, and optional action button. */
export function EmptyState({ icon: Icon, title, message, action }: { icon: LucideIcon; title?: string; message: string; action?: ReactNode }) {
  return <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center">
    <div className="mb-4 flex size-11 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
      <Icon size={20} strokeWidth={1.6} />
    </div>
    {title && <strong className="mb-1 font-display text-sm font-semibold uppercase tracking-[0.04em] text-foreground">{title}</strong>}
    <p className="max-w-[36ch] text-sm text-muted-foreground">{message}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

/** Animated spinner used during loading states. */
export function LoadingSpinner({ className }: { className?: string }) {
  return <LoaderCircle aria-label="Loading" className={cn("size-5 animate-spin text-primary", className)} />;
}

/** Notification banner (success/error/info) that appears at the top of the screen. Dismissible. */
export function Toast({ kind, message, onClose }: { kind: "success" | "error" | "info"; message: string; onClose: () => void }) {
  return <div role="status" className={cn(
    "fixed left-1/2 top-5 z-50 flex w-[min(90vw,380px)] -translate-x-1/2 items-center justify-between gap-4 rounded-md border border-border-strong bg-card px-4 py-3 text-sm animate-fade-in",
    kind === "error" ? "text-primary" : kind === "success" ? "text-success-foreground" : "text-info-foreground"
  )}>
    {message}
    <Button type="button" variant="ghost" size="sm" aria-label="Dismiss notification" onClick={onClose} className="size-7 p-0"><X size={16}/></Button>
  </div>;
}

/** Centered dialog overlay. Closes on backdrop click or Escape key. */
export function Modal({ title, children, onClose, actions }: { title: string; children: ReactNode; onClose: () => void; actions?: ReactNode }) {
  const panelRef = useDialog<HTMLDivElement>(true, onClose);
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  return <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: reduceMotion ? 0 : 0.15 }}
    className="fixed inset-0 z-40 flex items-center justify-center bg-overlay p-4" onMouseDown={onClose}>
    <motion.div
      ref={panelRef} tabIndex={-1}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={e => e.stopPropagation()}
      className="flex max-h-[min(85vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-border-strong bg-card outline-none">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h2 id={titleId} className="font-display text-lg font-semibold uppercase leading-tight tracking-[0.02em]">{title}</h2>
        <Button variant="ghost" size="sm" aria-label="Close dialog" onClick={onClose} className="-mr-1.5 size-8 p-0"><X size={18}/></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      {actions && <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted px-5 py-3">{actions}</div>}
    </motion.div>
  </motion.div>;
}

/** User avatar — shows an image or falls back to initials derived from the name. Neutral, never red. */
export function Avatar({ name, src }: { name: string; src?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-accent font-display text-xs font-semibold text-foreground" aria-label={name}>
    {src && !imageFailed
      ? <img src={src} alt={name} onError={() => setImageFailed(true)} className="size-full object-cover"/>
      : name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
  </div>;
}

/**
 * Bottom tab navigation for the resident mobile view.
 * Fixed to viewport bottom with safe-area padding for notched devices.
 * Supports keyboard navigation (arrow keys). Active tab = foreground text + red marker.
 */
export function TabBar({ items, activeTab, onTabChange, className }: { items: readonly { name: string; icon: LucideIcon }[]; activeTab: string; onTabChange: (name: string) => void; className?: string }) {
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

  return <nav aria-label="Tab navigation" className={cn(
    "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card",
    "pb-[env(safe-area-inset-bottom,0px)]",
    className
  )}>
    <div role="tablist" className="mx-auto grid h-14 px-2" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((item, i) => (
        <button key={item.name} type="button" role="tab" aria-selected={activeTab === item.name}
          tabIndex={activeTab === item.name ? 0 : -1}
          onClick={() => onTabChange(item.name)}
          onKeyDown={e => handleKeyDown(e, i)}
          className={cn(
            "relative flex h-full flex-col items-center justify-center gap-1 rounded-none border-none bg-transparent px-1 font-display text-[10px] font-medium uppercase tracking-[0.08em] transition-colors",
            focusRing,
            activeTab === item.name ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}>
          {activeTab === item.name && (
            <motion.span
              layoutId="tab-indicator"
              className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-primary"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <item.icon size={20} strokeWidth={activeTab === item.name ? 2.1 : 1.7} />
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  </nav>;
}

/**
 * Package summary card used in resident and staff views.
 * Shows carrier, tracking code, status badge, arrival date, and optional recipient info (staff view).
 */
export function PackageCard({ carrierName, trackingCode, status, arrivedAt, description, recipientName, recipientUnit, onClick, className }: {
  carrierName: string; trackingCode?: string; status: "received" | "available" | "scheduled" | "prepared" | "picked_up";
  arrivedAt: string; description?: string; recipientName?: string; recipientUnit?: string; onClick?: () => void; className?: string;
}) {
  return <Card hover={!!onClick} {...(onClick ? { onClick } : {})} {...(className ? { className } : {})}>
    <div className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Package size={16} className="shrink-0 text-muted-foreground" />
          <span className="truncate text-[15px] font-semibold">{carrierName}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      {trackingCode && <p className="mt-1.5 truncate pl-[26px] font-mono text-[13px] text-foreground/90">{trackingCode}</p>}
      <p className="mt-1 pl-[26px] text-sm text-muted-foreground">
        {description && <>{description} · </>}Arrived {arrivedAt}
      </p>
      {recipientName && <>
        <div className="my-3 border-t border-border" />
        <p className="text-sm"><span className="font-semibold">{recipientName}</span>{recipientUnit && <span className="font-mono text-muted-foreground"> · {recipientUnit}</span>}</p>
      </>}
    </div>
  </Card>;
}

/**
 * Scheduled pickup card showing date, time slot, package count, status, and optional action button.
 * Action button uses stopPropagation so it doesn't trigger the card's onClick.
 */
export function AppointmentCard({ date, timeSlot, packageCount, status, residentName, residentUnit, onAction, actionLabel, onClick, className }: {
  date: string; timeSlot: string; packageCount: number; status: "scheduled" | "prepared" | "picked_up";
  residentName?: string; residentUnit?: string; onAction?: () => void; actionLabel?: string; onClick?: () => void; className?: string;
}) {
  return <Card hover={!!onClick} {...(onClick ? { onClick } : {})} {...(className ? { className } : {})}>
    <div className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Clock3 size={16} className="shrink-0 text-muted-foreground" />
          <span className="text-[15px] font-semibold">{date}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1.5 pl-[26px] font-mono text-[15px] text-foreground">{timeSlot}</p>
      <div className="mt-2 flex items-center gap-1.5 pl-[26px] text-sm text-muted-foreground">
        <span>{packageCount} package{packageCount !== 1 ? "s" : ""}</span>
      </div>
      {residentName && <p className="mt-1.5 pl-[26px] text-sm"><span className="font-semibold">{residentName}</span>{residentUnit && <span className="font-mono text-muted-foreground"> · {residentUnit}</span>}</p>}
      {onAction && actionLabel && <div className="mt-3 flex justify-end">
        <Button size="sm" variant={actionLabel === "Cancel" ? "destructive" : "primary"} onClick={e => { e.stopPropagation(); onAction(); }}>{actionLabel}</Button>
      </div>}
    </div>
  </Card>;
}

/** Column definition for the Table component — exported for use by consumers. */
export type Column<T> = {
  key: string; header: string; render?: (row: T) => ReactNode; sortable?: boolean; width?: string; align?: "left" | "center" | "right";
};

/**
 * Generic data table for the staff console: 40px rows, hairline dividers, uppercase column labels.
 * Supports sortable columns, custom cell renderers, row click handlers, and horizontal scroll on mobile.
 */
export function Table<T>({ columns, data, keyExtractor, sortKey, sortDir, onSort, onRowClick, emptyMessage, className }: {
  columns: Column<T>[]; data: T[]; keyExtractor: (row: T) => string; sortKey?: string; sortDir?: "asc" | "desc";
  onSort?: (key: string) => void; onRowClick?: (row: T) => void; emptyMessage?: string; className?: string;
}) {
  const align = (a?: string) => a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";
  return <div className={cn("overflow-x-auto rounded-md border border-border bg-background", className)}>
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-card">
          {columns.map(col => (
            <th key={col.key} scope="col" style={col.width ? { width: col.width } : undefined}
              aria-sort={col.sortable && sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
              className={cn("group h-9 whitespace-nowrap px-3", labelClass, align(col.align), col.sortable && onSort && "cursor-pointer select-none hover:text-foreground")}
              onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}>
              <span className="inline-flex items-center gap-1">
                {col.header}
                {col.sortable && sortKey === col.key
                  ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                  : col.sortable && <ChevronsUpDown size={12} className="opacity-0 group-hover:opacity-60" />}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0
          ? <tr><td colSpan={columns.length} className="border-t border-border px-3 py-10 text-center text-muted-foreground">{emptyMessage || "No data"}</td></tr>
          : data.map(row => (
            <tr key={keyExtractor(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn("border-t border-border transition-colors", onRowClick && "cursor-pointer hover:bg-muted")}>
              {columns.map(col => (
                <td key={col.key} style={col.width ? { width: col.width } : undefined} className={cn("h-10 px-3", align(col.align))}>
                  {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  </div>;
}

/**
 * Slide-in panel from right (desktop) or bottom (mobile).
 * Used for detail views. Closes on overlay click or Escape.
 */
export function Drawer({ open, onClose, title, children, side = "right", width = "max-w-md", className }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; side?: "right" | "bottom"; width?: string; className?: string;
}) {
  const panelRef = useDialog<HTMLDivElement>(open, onClose);
  const reduceMotion = useReducedMotion();

  return <AnimatePresence>
    {open && <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-overlay" onClick={onClose} />
      <motion.div
        initial={side === "right" ? { x: "100%" } : { y: "100%" }}
        animate={side === "right" ? { x: 0 } : { y: 0 }}
        exit={side === "right" ? { x: "100%" } : { y: "100%" }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 }}
        ref={panelRef} tabIndex={-1}
        role="dialog" aria-modal="true" aria-label={title} className={cn(
        side === "right"
          ? `fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border-strong bg-card outline-none ${width}`
          : "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-lg border-t border-border-strong bg-card outline-none",
        className
      )}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          {title && <h2 className="font-display text-base font-semibold uppercase tracking-[0.04em]">{title}</h2>}
          <Button variant="ghost" size="sm" aria-label="Close drawer" onClick={onClose} className="ml-auto size-8 p-0"><X size={18} /></Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </>}
  </AnimatePresence>;
}

/** Search input with icon, clear button, and optional debounce. Useful for filtering lists. */
export function SearchField({ value, onChange, placeholder = "Search…", debounceMs = 0, className }: { value: string; onChange: (value: string) => void; placeholder?: string; debounceMs?: number; className?: string }) {
  const [draft, setDraft] = useState(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (debounceMs <= 0 || draft === value) return;
    const timer = setTimeout(() => onChangeRef.current(draft), debounceMs);
    return () => clearTimeout(timer);
  }, [draft, value, debounceMs]);
  const update = (next: string) => { setDraft(next); if (debounceMs <= 0) onChange(next); };
  const clear = () => { setDraft(""); onChange(""); };

  return <div className={cn("relative", className)}>
    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <input type="text" value={draft} onChange={e => update(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-9 text-[15px] text-foreground outline-none transition-[border-color] placeholder:text-subtle-foreground hover:border-muted-foreground/40 focus:border-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
    {draft && <button type="button" aria-label="Clear search" onClick={clear} className={cn("absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", focusRing)}><X size={15} /></button>}
  </div>;
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Number that rolls digit-by-digit when it changes (700ms). Columns are keyed from the right so
 * existing digits animate when the number gains a place. Screen readers get the plain value.
 * prefers-reduced-motion is handled by the global transition override in styles.css.
 */
export function RollingNumber({ value, format = (n: number) => n.toLocaleString("en-US"), className }: { value: number | string; format?: (n: number) => string; className?: string }) {
  const text = typeof value === "number" ? format(value) : value;
  const chars = [...text];
  return <span className={cn("relative inline-flex tabular-nums", className)}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true" className="inline-flex h-[1.2em] overflow-hidden leading-[1.2em]">
      {chars.map((ch, i) => {
        const key = chars.length - i;
        if (!/\d/.test(ch)) return <span key={`s${key}`}>{ch}</span>;
        return <span key={`d${key}`} className="flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]" style={{ transform: `translateY(-${Number(ch) * 1.2}em)` }}>
          {DIGITS.map(d => <span key={d} className="h-[1.2em]">{d}</span>)}
        </span>;
      })}
    </span>
  </span>;
}

/**
 * KPI tile: uppercase label, large rolling numeral, optional trend line.
 * variant "card" = standalone flat card; "strip" = cell inside <KpiStrip> (no own border).
 * tone "alert" paints the numeral red (e.g. overdue).
 */
export function StatCard({ icon: Icon, label, value, trend, trendLabel, className, variant = "card", tone = "default" }: {
  icon: LucideIcon; label: string; value: string | number; trend?: "up" | "down" | "neutral"; trendLabel?: string; className?: string;
  variant?: "card" | "strip"; tone?: "default" | "alert";
}) {
  const rolls = typeof value === "number" || /^[\d,.]+$/.test(value);
  const body = <>
    <div className="flex items-center justify-between gap-3">
      <p className={cn(labelClass, "truncate")}>{label}</p>
      <Icon size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
    </div>
    <p className={cn("mt-3 font-display text-[44px] font-medium leading-none tracking-[-0.02em] tabular-nums sm:text-[52px]", tone === "alert" && "text-primary")}>
      {rolls ? <RollingNumber value={value} /> : value}
    </p>
    {trend && trendLabel && <p className={cn(
      "mt-2 text-xs tabular-nums",
      trend === "up" && "text-success-foreground",
      trend === "down" && "text-primary",
      trend === "neutral" && "text-muted-foreground"
    )}>
      {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendLabel}
    </p>}
  </>;
  return variant === "strip"
    ? <div className={cn("bg-card px-4 pb-4 pt-3.5", className)}>{body}</div>
    : <Card className={cn("px-4 pb-4 pt-3.5", className)}>{body}</Card>;
}

/** One bordered strip of KPI cells divided by hairlines (use <StatCard variant="strip" />). */
const stripCols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;
export function KpiStrip({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  return <div className={cn("grid gap-px overflow-hidden rounded-lg border border-border bg-border", stripCols[cols], className)}>{children}</div>;
}

/** Section heading: optional uppercase eyebrow, display title, right-aligned actions. */
export function SectionHeader({ eyebrow, title, actions, className }: { eyebrow?: string; title: string; actions?: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
    <div className="min-w-0">
      {eyebrow && <p className={labelClass}>{eyebrow}</p>}
      <h2 className="mt-1 font-display text-2xl font-medium uppercase leading-none tracking-[-0.01em]">{title}</h2>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}

/**
 * Bezel "device" frame for the pickup board. With rim={true} it adds the orbiting red rim light + glow.
 * Hero (landing + auth) ONLY per DESIGN.md — app screens use flat Cards.
 */
export function DeviceFrame({ children, rim = true, className }: { children: ReactNode; rim?: boolean; className?: string }) {
  return <div className={cn("relative rounded-lg", className)}>
    {rim && <div aria-hidden="true" className="rim-glow" />}
    <div className={cn("relative overflow-hidden rounded-lg bg-card shadow-bezel", rim && "rim-frame")}>{children}</div>
  </div>;
}

/** Sonner toast helper — wraps sonner's toast with Red-E Now defaults. */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string | number) => toast.dismiss(id),
  promise: toast.promise,
};

/** Confirmation dialog for destructive or important actions. Alert dialog role for accessibility. */
export function ConfirmPrompt({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", variant = "destructive", onConfirm, onCancel, loading }: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: "destructive" | "primary"; onConfirm: () => void; onCancel: () => void; loading?: boolean }) {
  // Focus lands on Cancel so a stray Enter never confirms a destructive action.
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useDialog<HTMLDivElement>(true, onCancel, cancelRef);
  const titleId = useId();
  const messageId = useId();

  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-overlay p-4 animate-fade-in" onMouseDown={onCancel}>
    <div ref={panelRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId} onMouseDown={e => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-lg border border-border-strong bg-card outline-none animate-fade-in">
      <div className="px-5 pb-5 pt-5">
        <h2 id={titleId} className="font-display text-lg font-semibold uppercase leading-tight tracking-[0.02em]">{title}</h2>
        <p id={messageId} className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border bg-muted px-5 py-3">
        <Button ref={cancelRef} type="button" variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button type="button" variant={variant} onClick={onConfirm} disabled={loading} aria-busy={loading}>
          {loading && <LoadingSpinner className="size-4 text-current" />}{confirmLabel}
        </Button>
      </div>
    </div>
  </div>;
}
