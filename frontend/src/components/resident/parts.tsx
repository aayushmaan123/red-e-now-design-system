/**
 * Small pieces shared by the resident tabs: page and section headings,
 * inline notices, list states and a select field. Everything is built from
 * design tokens and `components/common`.
 */
import { type ComponentProps, type ReactNode, useId } from "react";
import { ChevronDown, CircleAlert, CircleCheck, type LucideIcon } from "lucide-react";
import { Button, Card, EmptyState, labelClass } from "@/components/common";
import { cn } from "@/lib/utils";

/** 44px touch target on phones, the standard 40px control height from `sm` up. */
export const touchButton = "h-11 sm:h-10";

/** Page title for a tab: one h1, an optional line under it and one optional action. */
export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 sm:mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.022em] text-foreground sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}

/** Section title with an optional mono count and a right-hand action. */
export function SectionHeading({ title, count, action, className }: { title: string; count?: number; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex min-h-6 items-center justify-between gap-3", className)}>
      <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
        {count !== undefined && <span className="ml-2 font-mono text-xs font-normal tabular-nums text-muted-foreground">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

/**
 * Inline message. Errors are announced (`role="alert"`); successes stay quiet
 * (`role="status"`). The text keeps the foreground colour for contrast and the
 * icon carries the meaning.
 */
export function Notice({ kind, children, action, className }: { kind: "success" | "error"; children: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = kind === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm text-foreground",
        kind === "error" ? "border-destructive/40 tint-primary" : "border-border bg-muted",
        className,
      )}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" className={cn("shrink-0", kind === "error" ? "text-destructive" : "text-success-foreground")} />
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  );
}

/** Placeholder while a list loads for the first time. */
export function ListLoading({ label }: { label: string }) {
  return (
    <Card className="px-4 py-6">
      <p role="status" className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}

/** A list that could not be loaded: says so and offers a retry. */
export function ListError({ title, message, onRetry, busy }: { title: string; message: string; onRetry: () => void; busy?: boolean }) {
  return (
    <Card>
      <div role="alert">
        <EmptyState
          icon={CircleAlert}
          title={title}
          message={message}
          action={<Button variant="secondary" className={touchButton} onClick={onRetry} disabled={busy}>Try again</Button>}
        />
      </div>
    </Card>
  );
}

/** Shown above a list that is on screen but could not be refreshed. */
export function RefreshError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Notice kind="error" className="mb-3" action={<Button variant="ghost" size="sm" className="h-9 shrink-0 text-foreground" onClick={onRetry}>Try again</Button>}>
      {message}
    </Notice>
  );
}

/** Native select styled like the shared TextInput (label above, 44px tall). */
export function SelectField({ label, helperText, className, id, children, ...props }: ComponentProps<"select"> & { label: string; helperText?: string }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className={cn(labelClass, "block")}>{label}</label>
      <div className="relative">
        <select
          id={fieldId}
          {...props}
          aria-describedby={helperText ? `${fieldId}-note` : undefined}
          className={cn(
            "h-11 w-full appearance-none rounded-md border border-input bg-card pl-3 pr-9 text-[15px] text-foreground outline-none transition-[border-color] hover:border-muted-foreground/40 focus:border-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      {helperText && <p id={`${fieldId}-note`} className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}

/** One line of quiet status text with a leading icon (used in card footers). */
export function StatusLine({ icon: Icon, children, tone = "muted" }: { icon: LucideIcon; children: ReactNode; tone?: "muted" | "success" }) {
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Icon size={15} strokeWidth={1.8} aria-hidden="true" className={cn("mt-0.5 shrink-0", tone === "success" && "text-success-foreground")} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
