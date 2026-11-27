/**
 * StaffSidebar — section navigation for the staff console.
 *
 * Desktop: a fixed 232px rail. Small screens: the same navigation inside a
 * dialog that slides in from the left (focus is trapped, Escape closes it).
 * The live counts next to the pickup sections come from the loaded appointments.
 * Active item uses a shared layoutId so the red highlight slides between options.
 */
import { useId, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LayoutGroup, motion } from "framer-motion";
import { LogOut, X } from "lucide-react";
import { Avatar, Button } from "@/components/common";
import { cn } from "@/lib/utils";
import { BuildingName, useStaff } from "./StaffContext";
import { NAV_GROUPS, type SectionName } from "./StaffTypes";
import { plural } from "./format";
import { focusRing } from "./ui";

const ACTIVE_PILL = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.55,
};

function ActivePill({ id }: { id: string }) {
  return (
    <motion.span
      layoutId={id}
      className="absolute inset-0 rounded-md bg-primary/15 ring-1 ring-inset ring-primary/30"
      transition={ACTIVE_PILL}
    />
  );
}

/** What the number next to a section means, for screen readers. */
function useSectionCounts(): Partial<Record<SectionName, { count: number; meaning: string; urgent?: boolean }>> {
  const { todaysAppointments, prepQueue, checkedInAppointments } = useStaff();
  return {
    "Today's Pickups": {
      count: todaysAppointments.length,
      meaning: `${plural(todaysAppointments.length, "pickup")} still to hand over today`,
    },
    "Preparation Queue": {
      count: prepQueue.length,
      meaning: `${plural(prepQueue.length, "package")} to prepare`,
    },
    Handoff: {
      count: checkedInAppointments.length,
      meaning: `${plural(checkedInAppointments.length, "resident")} waiting at the desk`,
      urgent: true,
    },
  };
}

function NavList({ roomy = false, pillId }: { roomy?: boolean; pillId: string }) {
  const { section, choose } = useStaff();
  const counts = useSectionCounts();
  const idPrefix = useId();

  return (
    <nav aria-label="Management navigation" className="flex-1 overflow-y-auto px-3 py-3">
      {NAV_GROUPS.map((group, g) => (
        <div key={group.heading} className={g > 0 ? "mt-5" : undefined}>
          <p className="mb-1 px-2.5 text-xs font-medium text-muted-foreground">{group.heading}</p>
          <ul className="space-y-0.5">
            {group.items.map((item, i) => {
              const active = section === item.label;
              const info = counts[item.label];
              const showCount = !!info && info.count > 0;
              const countId = `${idPrefix}-${g}-${i}`;
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => choose(item.label)}
                    aria-current={active ? "page" : undefined}
                    aria-describedby={showCount ? countId : undefined}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] transition-[color,background-color] duration-200",
                      roomy ? "h-10" : "h-8",
                      focusRing,
                      active
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                    )}
                  >
                    {active && <ActivePill id={pillId} />}
                    <item.icon
                      size={16}
                      strokeWidth={active ? 2 : 1.8}
                      aria-hidden="true"
                      className="relative z-[1] shrink-0"
                    />
                    <span className="relative z-[1] truncate">{item.label}</span>
                    {showCount && (
                      <>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "relative z-[1] ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 font-mono text-[11.5px] tabular-nums transition-colors",
                            active || info.urgent
                              ? "tint-primary font-medium text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {info.count}
                        </span>
                        <span id={countId} hidden>{info.meaning}</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-sidebar-border pl-5 pr-2">
      <span aria-hidden="true" className="size-4 shrink-0 rounded-[3px] bg-primary" />
      <span className="truncate font-display text-[15px] font-semibold leading-tight tracking-[-0.015em]">Red-E Now</span>
      <span className="ml-auto flex shrink-0 items-center">{children}</span>
    </div>
  );
}

function Footer({ pillId }: { pillId: string }) {
  const { user, logout, choose, section } = useStaff();
  const accountActive = section === "Account";
  return (
    <div className="shrink-0 space-y-2 border-t border-sidebar-border p-3">
      <button
        type="button"
        onClick={() => choose("Account")}
        aria-label={`Account: ${user?.name || "Staff"}`}
        aria-current={accountActive ? "page" : undefined}
        className={cn(
          "relative flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-[color,background-color] duration-200",
          focusRing,
          accountActive ? "text-primary" : "hover:bg-sidebar-accent/70",
        )}
      >
        {accountActive && <ActivePill id={pillId} />}
        <span className="relative z-[1] flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={user?.name || "Staff"} />
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-[13.5px] font-medium leading-tight", accountActive && "text-primary")}>
              {user?.name || "Staff"}
            </span>
            <span className="block truncate text-xs leading-tight text-muted-foreground"><BuildingName /></span>
          </span>
        </span>
      </button>
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 px-2.5 text-[13.5px] font-medium" onClick={logout}>
        <LogOut size={16} strokeWidth={1.8} aria-hidden="true" /> Log out
      </Button>
    </div>
  );
}

function SidebarBody({ roomy = false, pillId }: { roomy?: boolean; pillId: string }) {
  return (
    <LayoutGroup id={pillId}>
      <NavList roomy={roomy} pillId={pillId} />
      <Footer pillId={pillId} />
    </LayoutGroup>
  );
}

export function StaffSidebar() {
  const { menu, setMenu } = useStaff();

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-[232px] flex-col border-r border-sidebar-border bg-sidebar/90 backdrop-blur-md lg:flex">
        <Brand><span className="pr-3 text-xs text-muted-foreground">Front desk</span></Brand>
        <SidebarBody pillId="staff-nav-desktop" />
      </aside>

      {/* Small-screen menu */}
      <Dialog.Root open={menu} onOpenChange={setMenu}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              "fixed inset-0 z-40 bg-overlay lg:hidden",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
              "data-[state=open]:duration-300 data-[state=closed]:duration-200",
            )}
          />
          <Dialog.Content
            aria-describedby={undefined}
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex w-[min(86vw,304px)] flex-col border-r border-border-strong bg-sidebar outline-none lg:hidden",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
              "data-[state=open]:duration-300 data-[state=closed]:duration-200",
              "ease-out",
            )}
          >
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Brand>
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" aria-label="Close menu" className="size-8 p-0">
                  <X size={18} aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </Brand>
            <SidebarBody roomy pillId="staff-nav-mobile" />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
