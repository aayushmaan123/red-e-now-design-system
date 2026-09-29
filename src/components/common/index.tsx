import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useState, useEffect, useRef } from "react";
import { X, LoaderCircle, Package, Clock3, ChevronUp, ChevronDown, ChevronsUpDown, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ variant = "primary", size = "md", fullWidth, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "destructive"; size?: "sm" | "md" | "lg"; fullWidth?: boolean }) {
  return <button {...props} className={cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
    variant === "secondary" && "border border-border bg-card text-foreground hover:bg-secondary hover:shadow-sm",
    variant === "ghost" && "text-foreground hover:bg-secondary",
    variant === "destructive" && "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
    size === "sm" && "h-9 px-3 text-sm",
    size === "md" && "h-11 px-4 text-sm",
    size === "lg" && "h-12 px-5 text-base",
    fullWidth && "w-full",
    className
  )}>{children}</button>;
}

export function TextInput({ label, error, helperText, className, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; helperText?: string }) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  return <div className="space-y-2">
    <label htmlFor={fieldId} className="block text-sm font-medium text-foreground">{label}</label>
    <input id={fieldId} {...props} aria-invalid={!!error} aria-describedby={error || helperText ? `${fieldId}-note` : undefined} className={cn(
      "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 focus:shadow-sm aria-invalid:border-destructive",
      className
    )} />
    {(error || helperText) && <p id={`${fieldId}-note`} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>{error || helperText}</p>}
  </div>;
}

export function Card({ children, className, hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={cn(
    "rounded-xl border border-border bg-card shadow-card transition-all duration-300",
    hover && "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 cursor-pointer",
    className
  )}>{children}</div>;
}

const statusStyle: Record<string, string> = {
  received: "bg-info/10 text-info",
  available: "bg-success/10 text-success",
  scheduled: "bg-warning/15 text-warning-foreground",
  prepared: "bg-prepared/15 text-prepared",
  picked_up: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: "received" | "available" | "scheduled" | "prepared" | "picked_up" }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors duration-200", statusStyle[status])}>{status.replace("_", " ")}</span>;
}

export function EmptyState({ icon: Icon, title, message, action }: { icon: LucideIcon; title?: string; message: string; action?: ReactNode }) {
  return <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center animate-fade-in">
    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors duration-300">
      <Icon size={23} strokeWidth={1.6} />
    </div>
    {title && <strong className="mb-1 font-medium text-foreground">{title}</strong>}
    <p className="text-sm text-muted-foreground">{message}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

export function LoadingSpinner({ className }: { className?: string }) {
  return <LoaderCircle aria-label="Loading" className={cn("size-5 animate-spin text-primary", className)} />;
}

export function Toast({ kind, message, onClose }: { kind: "success" | "error" | "info"; message: string; onClose: () => void }) {
  return <div role="status" className={cn(
    "fixed left-1/2 top-5 z-50 flex w-[min(90vw,380px)] -translate-x-1/2 items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg animate-fade-in-down",
    kind === "error" ? "text-destructive" : kind === "success" ? "text-success" : "text-info"
  )}>
    {message}
    <Button type="button" variant="ghost" size="sm" aria-label="Dismiss notification" onClick={onClose} className="size-7 p-0"><X size={16}/></Button>
  </div>;
}

export function Modal({ title, children, onClose, actions }: { title: string; children: ReactNode; onClose: () => void; actions?: ReactNode }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-overlay px-4 animate-fade-in" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl animate-float-up">
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold uppercase">{title}</h2>
        <Button variant="ghost" size="sm" aria-label="Close dialog" onClick={onClose} className="size-8 p-0"><X size={18}/></Button>
      </div>
      {children}
      {actions && <div className="mt-6 flex justify-end gap-2">{actions}</div>}
    </div>
  </div>;
}

export function Avatar({ name, src }: { name: string; src?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary transition-transform duration-200 hover:scale-110" aria-label={name}>
    {src && !imageFailed
      ? <img src={src} alt={name} onError={() => setImageFailed(true)} className="size-full object-cover"/>
      : name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
  </div>;
}

export function TabBar({ items, activeTab, onTabChange, className }: { items: readonly { name: string; icon: LucideIcon }[]; activeTab: string; onTabChange: (name: string) => void; className?: string }) {
  return <nav aria-label="Tab navigation" className={cn(
    "fixed inset-x-0 bottom-0 z-20 border-t border-border/30 bg-card/80 backdrop-blur-xl backdrop-saturate-150 transition-theme",
    "pb-[env(safe-area-inset-bottom,0px)]",
    className
  )}>
    <div className="mx-auto grid h-[50px] px-2" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map(item => (
        <button key={item.name} type="button" role="tab" aria-selected={activeTab === item.name} aria-current={activeTab === item.name ? "page" : undefined}
          onClick={() => onTabChange(item.name)}
          className={cn(
            "flex h-full flex-col items-center justify-center gap-0.5 rounded-none border-none bg-transparent px-1 text-[10px] font-medium tracking-wide transition-colors duration-200",
            activeTab === item.name ? "text-primary" : "text-muted-foreground active:text-foreground"
          )}>
          <item.icon size={22} strokeWidth={activeTab === item.name ? 2.2 : 1.7} className="transition-all duration-200" />
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  </nav>;
}

export function PackageCard({ carrierName, trackingCode, status, arrivedAt, description, recipientName, recipientUnit, onClick, className }: {
  carrierName: string; trackingCode?: string; status: "received" | "available" | "scheduled" | "prepared" | "picked_up";
  arrivedAt: string; description?: string; recipientName?: string; recipientUnit?: string; onClick?: () => void; className?: string;
}) {
  return <Card hover={!!onClick} className={className}>
    <div className={cn("p-4", onClick && "cursor-pointer")} onClick={onClick}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Package size={18} className="shrink-0 text-muted-foreground" />
          <span className="font-medium">{carrierName}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      {trackingCode && <p className="mt-1 truncate pl-[30px] font-mono text-xs text-muted-foreground">{trackingCode}</p>}
      <p className="mt-1.5 text-sm text-muted-foreground">
        {description && <>{description} · </>}Arrived {arrivedAt}
      </p>
      {recipientName && <>
        <div className="my-2.5 border-t border-border" />
        <p className="text-sm"><span className="font-medium">{recipientName}</span>{recipientUnit && <span className="text-muted-foreground"> · {recipientUnit}</span>}</p>
      </>}
    </div>
  </Card>;
}

export function AppointmentCard({ date, timeSlot, packageCount, status, residentName, residentUnit, onAction, actionLabel, onClick, className }: {
  date: string; timeSlot: string; packageCount: number; status: "scheduled" | "prepared" | "picked_up";
  residentName?: string; residentUnit?: string; onAction?: () => void; actionLabel?: string; onClick?: () => void; className?: string;
}) {
  return <Card hover={!!onClick} className={className}>
    <div className={cn("p-4", onClick && "cursor-pointer")} onClick={onClick}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Clock3 size={18} className="shrink-0 text-muted-foreground" />
          <span className="font-medium">{date}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1 pl-[30px] text-sm text-muted-foreground">{timeSlot}</p>
      <div className="mt-2.5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Package size={14} className="shrink-0" />
        <span>{packageCount} package{packageCount !== 1 ? "s" : ""}</span>
      </div>
      {residentName && <p className="mt-1.5 text-sm"><span className="font-medium">{residentName}</span>{residentUnit && <span className="text-muted-foreground"> · {residentUnit}</span>}</p>}
      {onAction && actionLabel && <div className="mt-3 flex justify-end">
        <Button size="sm" variant={actionLabel === "Cancel" ? "destructive" : "primary"} onClick={e => { e.stopPropagation(); onAction(); }}>{actionLabel}</Button>
      </div>}
    </div>
  </Card>;
}

export type Column<T> = {
  key: string; header: string; render?: (row: T) => ReactNode; sortable?: boolean; width?: string; align?: "left" | "center" | "right";
};

export function Table<T>({ columns, data, keyExtractor, sortKey, sortDir, onSort, onRowClick, emptyMessage, className }: {
  columns: Column<T>[]; data: T[]; keyExtractor: (row: T) => string; sortKey?: string; sortDir?: "asc" | "desc";
  onSort?: (key: string) => void; onRowClick?: (row: T) => void; emptyMessage?: string; className?: string;
}) {
  const align = (a?: string) => a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";
  return <div className={cn("overflow-x-auto rounded-xl border border-border bg-card", className)}>
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-secondary">
          {columns.map(col => (
            <th key={col.key} style={col.width ? { width: col.width } : undefined}
              className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground", align(col.align), col.sortable && onSort && "cursor-pointer select-none hover:text-foreground")}
              onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}>
              <span className="inline-flex items-center gap-1">
                {col.header}
                {col.sortable && sortKey === col.key
                  ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                  : col.sortable && <ChevronsUpDown size={12} className="opacity-0 group-hover:opacity-40" />}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0
          ? <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">{emptyMessage || "No data"}</td></tr>
          : data.map(row => (
            <tr key={keyExtractor(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn("border-t border-border transition-colors", onRowClick && "cursor-pointer hover:bg-secondary/50")}>
              {columns.map(col => (
                <td key={col.key} style={col.width ? { width: col.width } : undefined} className={cn("px-4 py-3", align(col.align))}>
                  {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  </div>;
}

export function Drawer({ open, onClose, title, children, side = "right", width = "max-w-md", className }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; side?: "right" | "bottom"; width?: string; className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return <>
    <div className="fixed inset-0 z-40 bg-overlay animate-fade-in" onClick={onClose} />
    <div role="dialog" aria-modal="true" aria-label={title} className={cn(
      side === "right"
        ? `fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-xl animate-slide-in-from-right ${width}`
        : "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-xl animate-slide-in-from-bottom",
      className
    )}>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        {title && <h2 className="font-display text-lg font-semibold uppercase">{title}</h2>}
        <Button variant="ghost" size="sm" aria-label="Close drawer" onClick={onClose} className="ml-auto size-8 p-0"><X size={18} /></Button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
    </div>
  </>;
}

export function SearchField({ value, onChange, placeholder = "Search...", debounceMs = 0, className }: { value: string; onChange: (value: string) => void; placeholder?: string; debounceMs?: number; className?: string }) {
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
    <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <input type="text" value={draft} onChange={e => update(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15" />
    {draft && <button type="button" aria-label="Clear search" onClick={clear} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"><X size={16} /></button>}
  </div>;
}

export function ConfirmPrompt({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", variant = "destructive", onConfirm, onCancel, loading }: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: "destructive" | "primary"; onConfirm: () => void; onCancel: () => void; loading?: boolean }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-overlay px-4 animate-fade-in" onMouseDown={onCancel}>
    <div role="alertdialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()} className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl animate-float-up">
      <h2 className="font-display text-xl font-semibold uppercase">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button type="button" variant={variant} onClick={onConfirm} disabled={loading} aria-busy={loading}>
          {loading && <LoadingSpinner className="size-4 text-current" />}{confirmLabel}
        </Button>
      </div>
    </div>
  </div>;
}
