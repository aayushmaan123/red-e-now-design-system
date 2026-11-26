/**
 * StaffSidebar — section navigation for the staff console.
 *
 * Desktop: a fixed 232px rail. Small screens: the same navigation inside a
 * dialog that slides in from the left (focus is trapped, Escape closes it).
 * The live counts next to the pickup sections come from the loaded appointments.
 */
import { useId, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LogOut, X } from "lucide-react";
import { Avatar, Button, ThemeTabs } from "@/components/common";
import { cn } from "@/lib/utils";
import { BuildingName, useStaff } from "./StaffContext";
import { NAV_GROUPS, type SectionName } from "./StaffTypes";
import { plural } from "./format";
import { focusRing } from "./ui";

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

function NavList({ roomy = false }: { roomy?: boolean }) {
  const { section, choose } = useStaff();
  const counts = useSectionCounts();
  const idPrefix = useId();

  return (
    <nav aria-label="Management navigation" className="flex-1 overflow-y-auto px-3 py-3">
      {NAV_GROUPS.map((group, g) => (
        <div key={group.heading} className={g > 0 ? "mt-5" : undefined}>
          <p className="mb-1 px-2.5 text-xs font-medium text-muted-foreground">{group.heading}</p>
          <ul className="space-y-px">
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
                      "relative flex w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] transition-colors",
                      roomy ? "h-10" : "h-8",
                      focusRing,
                      active
                        ? "bg-sidebar-accent font-medium text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    <item.icon size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
                    {item.label}
                    {showCount && (
                      <>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 font-mono text-[11.5px] tabular-nums",
                            info.urgent ? "tint-primary font-medium text-foreground" : "text-muted-foreground",
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

function Footer({ showTheme = false }: { showTheme?: boolean }) {
  const { user, logout, choose, section } = useStaff();
  return (
    <div className="shrink-0 space-y-2 border-t border-sidebar-border p-3">
      {showTheme && (
        <div className="flex items-center justify-between gap-3 px-2.5 py-1">
          <span className="text-[13px] text-muted-foreground">Theme</span>
          <ThemeTabs compact />
        </div>
      )}
      <button
        type="button"
        onClick={() => choose("Account")}
        aria-label={`Account: ${user?.name || "Staff"}`}
        aria-current={section === "Account" ? "page" : undefined}
        className={cn("flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-sidebar-accent", focusRing)}
      >
        <Avatar name={user?.name || "Staff"} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium leading-tight">{user?.name || "Staff"}</span>
          <span className="block truncate text-xs leading-tight text-muted-foreground"><BuildingName /></span>
        </span>
      </button>
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 px-2.5 text-[13.5px] font-medium" onClick={logout}>
        <LogOut size={16} strokeWidth={1.8} aria-hidden="true" /> Log out
      </Button>
    </div>
  );
}

export function StaffSidebar() {
  const { menu, setMenu } = useStaff();

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-[232px] flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand><span className="pr-3 text-xs text-muted-foreground">Front desk</span></Brand>
        <NavList />
        <Footer />
      </aside>

      {/* Small-screen menu */}
      <Dialog.Root open={menu} onOpenChange={setMenu}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay animate-fade-in lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,304px)] flex-col border-r border-border-strong bg-sidebar outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=open]:duration-200 lg:hidden"
          >
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Brand>
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" aria-label="Close menu" className="size-8 p-0">
                  <X size={18} aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </Brand>
            <NavList roomy />
            <Footer showTheme />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
