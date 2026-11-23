/**
 * StaffHeader — sticky top-bar for the staff dashboard.
 */
import { Menu, Moon, Sun } from "lucide-react";
import { Avatar, Button } from "@/components/common";
import { useStaff } from "./StaffContext";

export function StaffHeader() {
  const { user, section, menu, setMenu, choose, toggle, isDark } = useStaff();

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
          <span className="font-display text-xl font-bold uppercase text-primary lg:hidden">
            Red-E Now<span className="text-foreground">.</span>
          </span>
          <span className="hidden font-display text-lg font-semibold uppercase lg:inline">
            {section}
          </span>
          <span className="hidden rounded bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase text-primary sm:inline">
            Management
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="size-9 rounded-md p-0 lg:hidden"
            aria-label="Toggle theme"
            onClick={toggle}
          >
            {isDark ? (
              <Sun size={18} strokeWidth={1.8} />
            ) : (
              <Moon size={18} strokeWidth={1.8} />
            )}
          </Button>
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
