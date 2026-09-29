import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useState } from "react";
import { X, LoaderCircle, type LucideIcon } from "lucide-react";
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
