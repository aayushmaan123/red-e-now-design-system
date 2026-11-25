/**
 * StaffOverview — dashboard home with stat cards, recent activity, quick actions.
 */
import { Archive, ChevronRight, PackagePlus, ClipboardList, Search, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Card, EmptyState, StatCard, StatusBadge } from "@/components/common";
import { BuildingName, useStaff } from "./StaffContext";
import { STAT_DEFS } from "./StaffTypes";

export function StaffOverview() {
  const {
    user, date, packages, todaysAppointments, completedToday,
    choose, setDrawerPkg,
  } = useStaff();

  return (
    <>
      {/* Hero header */}
      <div className="relative mb-9">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <BuildingName /> <span className="mx-2">/</span> {date}
          </p>
          <h1 className="font-display text-[38px] font-semibold leading-none sm:text-[48px]">
            Welcome back, {user?.name.split(" ")[0] || "Team"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Your building at a glance today.</p>
        </motion.div>
      </div>

      {/* Stat cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4"
      >
        {STAT_DEFS.map((s) => {
          const count =
            s.label === "Today's Pickups"
              ? todaysAppointments.length
              : s.label === "Completed Today"
                ? completedToday.length
                : packages.filter(s.filter).length;
          return (
            <motion.div
              key={s.label}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            >
              <StatCard icon={s.icon} label={s.label} value={count} />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Recent activity + Quick actions */}
      <div className="mt-10 grid gap-9 xl:grid-cols-[1.5fr_1fr]">
        {/* Recent activity */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[23px] font-semibold">Recent Activity</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Latest updates</span>
          </div>
          {packages.length > 0 ? (
            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
            >
              {packages.slice(0, 4).map((p) => (
                <motion.div
                  key={p.id}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                >
                  <Card hover onClick={() => setDrawerPkg(p)} className="flex items-center gap-3 p-3">
                    <Package size={16} className="shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.carrier_name} · {p.resident_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.tracking_code}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <Card><EmptyState icon={Archive} message="No recent activity" /></Card>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="mb-4 font-display text-[23px] font-semibold">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: "Add Package", icon: PackagePlus, target: "Register Package" },
              { label: "Today's Queue", icon: ClipboardList, target: "Today's Pickups" },
              { label: "Search Resident", icon: Search, target: "Residents" },
            ].map((a) => (
              <Button
                key={a.label}
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => choose(a.target)}
                className="h-[60px] justify-start bg-card px-5 text-sm transition-colors hover:bg-secondary"
              >
                <a.icon size={19} className="text-primary" />
                {a.label}
                <ChevronRight size={17} className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
