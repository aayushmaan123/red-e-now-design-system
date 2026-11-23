/**
 * StaffSidebar — Linear-style sidebar with sliding highlight animation.
 *
 * Uses framer-motion layoutId so the active-item background pill
 * animates smoothly between nav items (spring physics, ~220 ms).
 */
import { Sun, Moon, LogOut, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/common";
import { useStaff } from "./StaffContext";
import { NAV_ITEMS } from "./StaffTypes";

/* ── Shared spring config (matches DESIGN.md 220 ms ease) ── */
const SPRING = { type: "spring", stiffness: 350, damping: 30 } as const;

function NavList({ layoutPrefix = "desktop" }: { layoutPrefix?: string }) {
  const { section, choose } = useStaff();

  return (
    <nav
      aria-label="Management navigation"
      className="flex-1 overflow-y-auto px-3 py-6"
    >
      <div className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = section === item.label;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => choose(item.label)}
              aria-current={active ? "page" : undefined}
              className="relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
            >
              {/* ── Sliding highlight pill ── */}
              {active && (
                <motion.div
                  layoutId={`sidebar-highlight-${layoutPrefix}`}
                  className="absolute inset-0 rounded-lg bg-primary/8"
                  transition={SPRING}
                  style={{ originY: "0px" }}
                />
              )}

              {/* ── Content (z-10 sits above the pill) ── */}
              <span
                className={`relative z-10 flex items-center gap-3 transition-colors duration-150 ${
                  active
                    ? "font-medium text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <item.icon size={18} strokeWidth={1.8} />
                {item.label}
              </span>

              {/* ── Hover highlight (non-active items only) ── */}
              {!active && (
                <span className="pointer-events-none absolute inset-0 rounded-lg bg-secondary opacity-0 transition-opacity duration-150 hover:opacity-100 peer-hover:opacity-100" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function StaffSidebar() {
  const { toggle, isDark, logout, menu, setMenu } = useStaff();

  const header = (
    <div className="border-b border-border px-6 py-7">
      <span className="font-display text-[29px] font-bold uppercase leading-none text-primary">
        Red-E Now<span className="text-foreground">.</span>
      </span>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Management portal
      </p>
    </div>
  );

  const footer = (
    <div className="border-t border-border p-3 space-y-1">
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 px-3 text-muted-foreground"
        onClick={toggle}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        {isDark ? "Light Mode" : "Dark Mode"}
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 px-3 text-muted-foreground"
        onClick={logout}
      >
        <LogOut size={18} /> Logout
      </Button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-[252px] border-r border-border bg-card lg:block">
        <div className="flex h-full flex-col">
          {header}
          <NavList layoutPrefix="desktop" />
          {footer}
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {menu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/60 lg:hidden"
              onClick={() => setMenu(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={SPRING}
              className="fixed inset-y-0 left-0 z-40 w-[min(82vw,280px)] border-r border-border bg-card shadow-2xl lg:hidden"
            >
              <Button
                variant="ghost"
                size="sm"
                aria-label="Close menu"
                className="absolute right-3 top-5 size-9 p-0"
                onClick={() => setMenu(false)}
              >
                <X size={20} />
              </Button>
              <div className="flex h-full flex-col">
                {header}
                <NavList layoutPrefix="mobile" />
                {footer}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
