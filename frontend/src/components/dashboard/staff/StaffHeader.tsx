/**
 * StaffHeader — sticky top-bar for the staff dashboard.
 */
import { Menu } from "lucide-react";
import { Avatar, Button, ThemeTabs } from "@/components/common";
import { useStaff } from "./StaffContext";

export function StaffHeader() {
  const { user, section, setMenu, choose } = useStaff();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className="mx-auto flex h-17 max-w-7xl items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Open menu"
            className="size-9 p-0 lg:hidden"
            onClick={() => setMenu(true)}
          >
            <Menu size={21} />
          </Button>
          <span className="font-display text-xl font-bold text-primary lg:hidden">
            Red-E Now<span className="text-foreground">.</span>
          </span>
          <span className="hidden font-display text-lg font-semibold lg:inline">
            {section}
          </span>
          <span className="hidden rounded bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase text-primary sm:inline">
            Management
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeTabs compact className="sm:hidden" />
          <ThemeTabs className="hidden sm:inline-flex" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => choose("Account")}
            className="h-auto gap-3 p-0"
          >
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium">{user?.name}</span>
              <span className="block text-xs text-muted-foreground">
                Property staff
              </span>
            </span>
            <Avatar name={user?.name || "Staff"} />
          </Button>
        </div>
      </div>
    </header>
  );
}
