/**
 * StaffAccount — user profile and logout.
 */
import { LogOut } from "lucide-react";
import { Avatar, Button, Card } from "@/components/common";
import { BuildingName, useStaff } from "./StaffContext";

export function StaffAccount() {
  const { user, logout } = useStaff();

  return (
    <>
      <h1 className="mb-6 font-display text-[38px] font-semibold animate-fade-in">
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
          <BuildingName /> · Management
        </p>

        <Button variant="secondary" className="mt-6" onClick={logout}>
          <LogOut size={16} /> Logout
        </Button>
      </Card>
    </>
  );
}
