/**
 * ButtonLink — a router link that looks like the shared Button.
 *
 * The shared Button renders a <button>, which is wrong for navigation (no middle-click, no
 * "open in new tab", needs JavaScript). Landing and auth calls to action are real links, so
 * this mirrors Button's classes on a TanStack <Link>. "inverse" is the quiet nav pill.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type AppPath = "/" | "/login" | "/signup" | "/forgot-password" | "/staff/login" | "/staff/forgot-password";

/** Focus ring shared by every link and control on the landing and auth screens. */
export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Quiet text link: muted until hovered or focused. */
export const quietLink = cn("rounded-sm text-muted-foreground transition-colors hover:text-foreground", focusRing);

/** Inline text link: foreground text, hairline underline that turns red on hover. */
export const textLink = cn(
  "rounded-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-primary",
  focusRing,
);

const variants = {
  primary: "bg-primary text-primary-foreground shadow-bezel-sm hover:bg-primary-hover active:shadow-none",
  secondary: "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-accent",
  inverse: "bg-foreground text-background hover:bg-foreground/85",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[15px]",
  lg: "h-11 px-5 text-[15px]",
} as const;

export function ButtonLink({ to, variant = "primary", size = "md", className, children, ...rest }: {
  to: AppPath;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <Link
      to={to}
      {...rest}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold tracking-wide transition-[background-color,border-color,color,box-shadow] [&_svg]:shrink-0",
        focusRing,
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
