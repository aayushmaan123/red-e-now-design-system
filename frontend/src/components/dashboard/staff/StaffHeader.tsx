/**
 * StaffHeader — compact sticky top bar: breadcrumb (building / section),
 * the search trigger for the command menu, theme tabs and the account button.
 */
import { useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";
import { Avatar, Button, Kbd, ThemeTabs } from "@/components/common";
import { cn } from "@/lib/utils";
import { BuildingName, useStaff } from "./StaffContext";
import { sectionTitle } from "./StaffTypes";
import { focusRing } from "./ui";

/** "⌘K" on Apple keyboards, "Ctrl K" elsewhere. Resolved after mount so the first render is the same everywhere. */
export function useShortcutLabel() {
  const [label, setLabel] = useState("Ctrl K");
  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)) setLabel("⌘K");
  }, []);
  return label;
}

export function StaffHeader() {
  const { user, section, setMenu, choose, setCommandOpen } = useStaff();
  const shortcut = useShortcutLabel();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="flex h-12 items-center gap-3 px-3 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open menu"
          className="size-9 p-0 lg:hidden"
          onClick={() => setMenu(true)}
        >
          <Menu size={19} aria-hidden="true" />
        </Button>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-2 text-sm">
            <li className="hidden min-w-0 shrink sm:block">
              <button
                type="button"
                onClick={() => choose("Dashboard")}
                className={cn("block max-w-[26ch] truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground", focusRing)}
              >
                <BuildingName />
              </button>
            </li>
            <li aria-hidden="true" className="hidden text-subtle-foreground sm:block">/</li>
            <li aria-current="page" className="min-w-0 truncate font-medium">{sectionTitle(section)}</li>
          </ol>
        </nav>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-haspopup="dialog"
          aria-keyshortcuts="Control+K Meta+K"
          aria-label="Search packages, residents and sections"
          className={cn(
            "flex h-8 shrink-0 items-center gap-2 rounded-md border border-input bg-card text-[13px] text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground",
            "w-9 justify-center md:w-64 md:justify-start md:px-2.5",
            focusRing,
          )}
        >
          <Search size={15} aria-hidden="true" className="shrink-0" />
          <span className="hidden flex-1 text-left md:inline">Search…</span>
          <Kbd className="hidden bg-muted md:inline-flex">{shortcut}</Kbd>
        </button>

        <ThemeTabs compact className="hidden sm:inline-flex" />

        <button
          type="button"
          onClick={() => choose("Account")}
          aria-label={`Account: ${user?.name || "Staff"}`}
          className={cn("shrink-0 rounded-full", focusRing)}
        >
          <Avatar name={user?.name || "Staff"} />
        </button>
      </div>
    </header>
  );
}
