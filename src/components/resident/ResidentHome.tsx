import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock3, History, House, Moon, Package, Sun, UserRound, LogOut } from "lucide-react";
import { Avatar, Button, Card, EmptyState, TabBar } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const tabs = [{ name: "Home", icon: House }, { name: "Packages", icon: Package }, { name: "Schedule", icon: CalendarDays }, { name: "History", icon: History }, { name: "Profile", icon: UserRound }] as const;

export function ResidentHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();
  const [tab, setTab] = useState<(typeof tabs)[number]["name"]>("Home");
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <div className="min-h-screen bg-background pb-20 transition-theme">
      <header className="border-b border-border bg-card transition-theme">
        <div className="mx-auto flex h-17 max-w-5xl items-center justify-between px-6">
          <span className="font-display text-[27px] font-bold uppercase leading-none text-primary">
            Red-E Now<span className="text-foreground">.</span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="size-9 rounded-full p-0" aria-label="Toggle theme" onClick={toggle}>
              {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            </Button>
            <Button variant="ghost" size="sm" className="size-10 rounded-full p-0" aria-label="Open profile" onClick={() => setTab("Profile")}>
              <Avatar name={user?.name || "Resident"} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-10 pt-8">
        <div className="mb-8 animate-fade-in-up">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{date}</p>
          <h1 className="font-display text-[37px] font-semibold uppercase leading-none sm:text-[44px]">
            {tab === "Home" ? `Welcome back, ${user?.name.split(" ")[0] || "Resident"}` : tab}
          </h1>
          {tab === "Home" && <p className="mt-3 text-sm text-muted-foreground">Here's what's happening at your building.</p>}
        </div>

        {tab === "Profile" ? (
          <Card className="p-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name || "Resident"} />
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
              </div>
              <Button variant="secondary" size="sm" onClick={toggle} className="gap-2">
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                {isDark ? "Light" : "Dark"}
              </Button>
            </div>
            <Button variant="secondary" className="mt-6" onClick={() => { signOut(); navigate({ to: "/login", replace: true }); }}>
              <LogOut size={16} /> Sign out
            </Button>
          </Card>
        ) : (
          <div className="grid gap-7 md:grid-cols-2">
            {(tab === "Home" || tab === "Packages") && (
              <section className="animate-fade-in-up stagger-1">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold uppercase">Your Packages</h2>
                  <span className="font-mono text-xs text-muted-foreground">00</span>
                </div>
                <Card hover><EmptyState icon={Package} message="No packages waiting for you right now" /></Card>
              </section>
            )}
            {(tab === "Home" || tab === "Schedule") && (
              <section className="animate-fade-in-up stagger-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold uppercase">Upcoming Pickups</h2>
                  <span className="font-mono text-xs text-muted-foreground">00</span>
                </div>
                <Card hover><EmptyState icon={Clock3} message="No pickups scheduled" /></Card>
              </section>
            )}
            {tab === "History" && (
              <section className="animate-fade-in-up">
                <h2 className="mb-3 font-display text-xl font-semibold uppercase">Activity History</h2>
                <Card><EmptyState icon={History} message="No activity yet" /></Card>
              </section>
            )}
          </div>
        )}

        {tab === "Home" && (
          <div className="mt-9 border-t border-border pt-6 animate-fade-in stagger-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Red-E Now / Your residence, simplified</p>
          </div>
        )}
      </main>

      <TabBar items={tabs} activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
