/**
 * Profile tab — who is signed in, the theme switcher and sign out.
 */
import { LogOut } from "lucide-react";
import { Avatar, Button, Card, ThemeTabs, labelClass } from "@/components/common";
import type { User } from "@/context/AuthContext";
import { PageHeader, touchButton } from "./parts";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right">{children}</dd>
    </div>
  );
}

export function ProfileTab({ user, buildingName, onSignOut }: { user: User | null; buildingName?: string | undefined; onSignOut: () => void }) {
  const name = user?.name || "Resident";
  return (
    <>
      <PageHeader title="Profile" description="Your account at the front desk." />

      <div className="max-w-md space-y-4">
        <Card>
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar name={name} />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold tracking-[-0.01em]">{name}</p>
              <p className="break-all font-mono text-[13px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          {(user?.unit || buildingName) && (
            <dl className="divide-y divide-border border-t border-border">
              {user?.unit && <DetailRow label="Unit"><span className="font-mono text-[13px]">{user.unit}</span></DetailRow>}
              {buildingName && <DetailRow label="Building">{buildingName}</DetailRow>}
            </dl>
          )}
        </Card>

        <Card className="p-4">
          <p className={labelClass} id="appearance-label">Appearance</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Dark, light or red. Saved on this device.</p>
          {/* 44px segments: the shared switcher is sized for pointer use by default. */}
          <ThemeTabs className="mt-3 flex w-full [&>button]:h-10 [&>button]:flex-1" />
        </Card>

        <Button variant="secondary" fullWidth className={touchButton} onClick={onSignOut}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </Button>
      </div>
    </>
  );
}
