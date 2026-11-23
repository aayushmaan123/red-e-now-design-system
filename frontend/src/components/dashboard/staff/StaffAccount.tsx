/**
 * StaffAccount — user profile, theme toggle and logout.
 */
import { LogOut, Moon, Sun } from "lucide-react";
import { Avatar, Button, Card } from "@/components/common";
import { useStaff } from "./StaffContext";

export function StaffAccount() {
  const { user, toggle, isDark, logout } = useStaff();

  return (
    <>
      <h1 className="mb-6 font-display text-[38px] font-semibold uppercase animate-fade-in">
        Account
      </h1>

      <Card className="max-w-xl p-6 animate-fade-in bg-card border-border">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name || "Staff"} />
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Oakwood Residences · Management
        </p>

        <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-background p-4">
          <div>
            <p className="text-sm font-medium">Dark Mode</p>
            <p className="text-xs text-muted-foreground">
              Switch between light and dark themes
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={toggle} className="gap-2">
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            {isDark ? "Light" : "Dark"}
          </Button>
        </div>

        <Button variant="secondary" className="mt-6" onClick={logout}>
          <LogOut size={16} /> Logout
        </Button>
      </Card>
    </>
  );
}
