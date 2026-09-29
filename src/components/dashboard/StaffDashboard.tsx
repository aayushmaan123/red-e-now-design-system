import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Archive, CalendarDays, CheckCheck, ChevronRight, ClipboardList, Clock3, History, House, LogOut, Menu, Moon, Package, PackagePlus, Search, Sun, UserRound, UsersRound, X } from "lucide-react";
import { Avatar, Button, Card, EmptyState, Modal } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const items = [{ label: "Dashboard", icon: House }, { label: "Register Package", icon: PackagePlus }, { label: "Packages", icon: Package }, { label: "Today's Pickups", icon: CalendarDays }, { label: "Upcoming", icon: Clock3 }, { label: "Preparation Queue", icon: ClipboardList }, { label: "Residents", icon: UsersRound }, { label: "History", icon: History }, { label: "Account", icon: UserRound }];
const stats = [{ label: "Waiting Packages", icon: Package, tone: "text-info bg-info/10" }, { label: "Today's Pickups", icon: CalendarDays, tone: "text-primary bg-primary/10" }, { label: "Prepared", icon: Archive, tone: "text-prepared bg-prepared/10" }, { label: "Completed Today", icon: CheckCheck, tone: "text-success bg-success/10" }];

export function StaffDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();
  const [section, setSection] = useState("Dashboard");
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());

  const logout = () => { signOut(); navigate({ to: "/staff/login", replace: true }); };
  const choose = (label: string) => { setMenu(false); setSection(label); };

  const sidebar = (
    <div className="flex h-full flex-col transition-theme">
      <div className="border-b border-border px-6 py-7">
        <span className="font-display text-[29px] font-bold uppercase leading-none text-primary">
          Red-E Now<span className="text-foreground">.</span>
        </span>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Management portal</p>
      </div>
      <nav aria-label="Management navigation" className="flex-1 space-y-0.5 px-3 py-6">
        {items.map(item => (
          <Button
            key={item.label}
            variant="ghost"
            size="md"
            onClick={() => choose(item.label)}
            aria-current={section === item.label ? "page" : undefined}
            className={`w-full justify-start gap-3 px-3 font-normal transition-all duration-200 ${section === item.label ? "bg-primary/10 font-medium text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
          >
            <item.icon size={18} strokeWidth={1.8} />
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="border-t border-border p-3 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 text-muted-foreground" onClick={toggle}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 text-muted-foreground" onClick={logout}>
          <LogOut size={18} /> Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:pl-[252px] transition-theme">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-[252px] border-r border-border bg-card lg:block transition-theme">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {menu && (
        <>
          <div className="fixed inset-0 z-30 bg-overlay lg:hidden animate-fade-in" onClick={() => setMenu(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 w-[min(82vw,280px)] bg-card shadow-xl lg:hidden animate-slide-in-left transition-theme">
            <Button variant="ghost" size="sm" aria-label="Close menu" className="absolute right-3 top-5 size-9 p-0" onClick={() => setMenu(false)}>
              <X size={20} />
            </Button>
            {sidebar}
          </aside>
        </>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-card transition-theme">
        <div className="mx-auto flex h-17 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" aria-label="Open menu" className="size-9 p-0 lg:hidden" onClick={() => setMenu(true)}>
              <Menu size={21} />
            </Button>
            <span className="font-display text-xl font-bold uppercase text-primary lg:hidden">
              Red-E Now<span className="text-foreground">.</span>
            </span>
            <span className="hidden font-display text-lg font-semibold uppercase lg:inline">{section}</span>
            <span className="hidden rounded bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase text-primary sm:inline">Management</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="size-9 rounded-full p-0 lg:hidden" aria-label="Toggle theme" onClick={toggle}>
              {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => choose("Account")} className="h-auto gap-3 p-0">
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-medium">{user?.name}</span>
                <span className="block text-xs text-muted-foreground">Property staff</span>
              </span>
              <Avatar name={user?.name || "Staff"} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-9 lg:px-10 lg:pt-12">
        {section === "Dashboard" ? (
          <>
            <div className="mb-9 animate-fade-in-up">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Oakwood Residences <span className="mx-2">/</span> {date}
              </p>
              <h1 className="font-display text-[38px] font-semibold uppercase leading-none sm:text-[48px]">
                Welcome back, {user?.name.split(" ")[0] || "Team"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">Your building at a glance today.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
              {stats.map((s, i) => (
                <Card key={s.label} hover className={`min-h-[150px] p-4 sm:p-5 animate-float-up stagger-${i + 1}`}>
                  <div className={`mb-5 flex size-9 items-center justify-center rounded-lg transition-colors duration-300 ${s.tone}`}>
                    <s.icon size={18} strokeWidth={1.8} />
                  </div>
                  <div className="font-display text-[35px] font-semibold leading-none">0</div>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
                </Card>
              ))}
            </div>

            <div className="mt-10 grid gap-9 xl:grid-cols-[1.5fr_1fr]">
              <section className="animate-fade-in-up stagger-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-[23px] font-semibold uppercase">Recent Activity</h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Latest updates</span>
                </div>
                <Card><EmptyState icon={Archive} message="No recent activity" /></Card>
              </section>
              <section className="animate-fade-in-up stagger-6">
                <h2 className="mb-4 font-display text-[23px] font-semibold uppercase">Quick Actions</h2>
                <div className="space-y-3">
                  {[{ label: "Add Package", icon: PackagePlus }, { label: "Today's Queue", icon: ClipboardList }, { label: "Search Resident", icon: Search }].map(a => (
                    <Button
                      key={a.label}
                      variant="secondary"
                      size="lg"
                      fullWidth
                      onClick={() => choose(a.label === "Add Package" ? "Register Package" : a.label === "Today's Queue" ? "Today's Pickups" : "Residents")}
                      className="h-[60px] justify-start bg-card px-5 text-sm shadow-card hover:shadow-lg transition-all duration-200"
                    >
                      <a.icon size={19} className="text-primary" />
                      {a.label}
                      <ChevronRight size={17} className="ml-auto text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : section === "Account" ? (
          <>
            <h1 className="mb-6 font-display text-[38px] font-semibold uppercase animate-fade-in-up">Account</h1>
            <Card className="max-w-xl p-6 animate-fade-in-up stagger-1">
              <div className="flex items-center gap-4">
                <Avatar name={user?.name || "Staff"} />
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">Oakwood Residences · Management</p>
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
              <Button variant="secondary" className="mt-6" onClick={logout}>
                <LogOut size={16} /> Logout
              </Button>
            </Card>
          </>
        ) : (
          <>
            <div className="mb-7 animate-fade-in-up">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Oakwood Residences / Management</p>
              <h1 className="font-display text-[38px] font-semibold uppercase leading-none">{section}</h1>
            </div>
            <Card className="max-w-3xl animate-fade-in-up stagger-1">
              <EmptyState
                icon={items.find(i => i.label === section)?.icon || Search}
                message={section === "Residents" ? "No residents to display" : section === "Packages" ? "No packages to display" : section === "History" ? "No activity yet" : "Nothing here yet"}
                action={section === "Register Package" ? <Button onClick={() => setModal("Register Package")}>Add Package</Button> : undefined}
              />
            </Card>
          </>
        )}
      </main>

      {modal && (
        <Modal title={modal} onClose={() => setModal(null)} actions={<Button variant="secondary" onClick={() => setModal(null)}>Close</Button>}>
          <p className="text-sm text-muted-foreground">Package registration will be available when your building's data service is connected.</p>
        </Modal>
      )}
    </div>
  );
}
