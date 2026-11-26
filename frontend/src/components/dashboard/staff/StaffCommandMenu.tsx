/**
 * StaffCommandMenu — Ctrl/Cmd+K palette for the staff console.
 *
 * Jumps to any section and finds a package (tracking code, carrier, resident,
 * unit, shelf, description) or a resident (name, unit, email). It searches only
 * what StaffContext has already loaded; it makes no requests of its own.
 *
 * Choosing a package opens its detail drawer; choosing a resident opens
 * Packages filtered to them (the same thing a Residents row does).
 * Built on cmdk (arrow keys, Home/End, Enter) inside a Radix dialog
 * (focus trap, Escape, role="dialog" with a title).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { CornerDownLeft, Package, Search, UserRound } from "lucide-react";
import { Kbd, StatusBadge } from "@/components/common";
import type { PackageRecord } from "@/api/packagesApi";
import type { ResidentOption } from "@/api/residentsApi";
import { useStaff } from "./StaffContext";
import { NAV_ITEMS } from "./StaffTypes";
import { plural } from "./format";
import { Mono } from "./ui";

const MAX_PACKAGES = 8;
const MAX_RESIDENTS = 6;

const itemClass =
  "flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none data-[selected=true]:bg-accent";
const groupClass =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";

const packageText = (p: PackageRecord) =>
  [
    p.tracking_code, p.carrier_name, p.resident_name, p.resident_unit,
    p.resident_unit ? `unit ${p.resident_unit}` : "", p.location_code, p.description,
    p.status.replace("_", " "),
  ].filter(Boolean).join(" ").toLowerCase();

const residentText = (r: ResidentOption) =>
  [r.name, r.unit, r.unit ? `unit ${r.unit}` : "", r.email].filter(Boolean).join(" ").toLowerCase();

export function StaffCommandMenu() {
  const {
    commandOpen, setCommandOpen, choose, section,
    allPackages, residents, setDrawerPkg, setSearchQ, setStatusFilter,
  } = useStaff();
  const [query, setQuery] = useState("");
  const openRef = useRef(commandOpen);
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    openRef.current = commandOpen;
    if (commandOpen) { setQuery(""); return; }
    // Run the chosen action once the dialog has closed and handed focus back,
    // so a drawer opened from here returns focus to the right place later.
    const action = pending.current;
    if (!action) return;
    pending.current = null;
    const timer = window.setTimeout(action, 60);
    return () => window.clearTimeout(timer);
  }, [commandOpen]);

  // Ctrl+K / Cmd+K toggles the menu from anywhere in the console.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      if (openRef.current) { setCommandOpen(false); return; }
      // One modal at a time: leave an open drawer or confirmation alone.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      setCommandOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

  const tokens = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const searching = tokens.length > 0;
  const matches = (haystack: string) => tokens.every((t) => haystack.includes(t));

  const sections = searching
    ? NAV_ITEMS.filter((item) => matches(`${item.label} ${item.title} ${item.keywords}`.toLowerCase()))
    : NAV_ITEMS;

  const packageHits = useMemo(() => {
    if (!searching) return [];
    const hits = allPackages.filter((p) => matches(packageText(p)));
    // Packages still in the building first; the API order (newest arrival) is kept within each half.
    return [...hits.filter((p) => p.status !== "picked_up"), ...hits.filter((p) => p.status === "picked_up")];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPackages, tokens]);

  const residentHits = useMemo(() => {
    if (!searching) return [];
    return residents.filter((r) => matches(residentText(r)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residents, tokens]);

  const waitingByResident = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of allPackages) {
      if (p.status !== "picked_up") counts.set(p.resident_id, (counts.get(p.resident_id) ?? 0) + 1);
    }
    return counts;
  }, [allPackages]);

  const run = (action: () => void) => {
    pending.current = action;
    setCommandOpen(false);
  };

  const openResident = (r: ResidentOption) => run(() => {
    setStatusFilter("");
    setSearchQ(r.name);
    choose("Packages");
  });

  return (
    <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[min(calc(100vw-1.5rem),640px)] -translate-x-1/2 overflow-hidden rounded-lg border border-border-strong bg-popover text-popover-foreground shadow-[0_24px_48px_-12px_var(--shadow-tone)] outline-none animate-fade-in"
        >
          <Dialog.Title className="sr-only">Command menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Go to a section, or search packages and residents by name, unit, tracking code or storage location.
            Use the arrow keys to move through results and Enter to open one.
          </Dialog.Description>

          <Command label="Command menu" shouldFilter={false} loop>
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search a name, unit, tracking code or shelf…"
                className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle-foreground"
              />
              <Kbd className="bg-muted">Esc</Kbd>
            </div>

            <Command.List className="max-h-[min(58vh,440px)] overflow-y-auto overscroll-contain p-1.5">
              <Command.Empty className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nothing matches “{query.trim()}”. Try a tracking code, a unit or a shelf.
              </Command.Empty>

              {packageHits.length > 0 && (
                <Command.Group
                  heading={packageHits.length > MAX_PACKAGES
                    ? `Packages · showing ${MAX_PACKAGES} of ${packageHits.length}`
                    : "Packages"}
                  className={groupClass}
                >
                  {packageHits.slice(0, MAX_PACKAGES).map((p) => (
                    <Command.Item key={p.id} value={`package-${p.id}`} onSelect={() => run(() => setDrawerPkg(p))} className={itemClass}>
                      <Package size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <Mono className="block truncate text-[13px] text-foreground">{p.tracking_code}</Mono>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.carrier_name} · {p.resident_name}{p.resident_unit ? ` · Unit ${p.resident_unit}` : ""}
                        </span>
                      </span>
                      {p.location_code && <Mono className="hidden shrink-0 text-muted-foreground sm:inline">{p.location_code}</Mono>}
                      <StatusBadge status={p.status} />
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {residentHits.length > 0 && (
                <Command.Group
                  heading={residentHits.length > MAX_RESIDENTS
                    ? `Residents · showing ${MAX_RESIDENTS} of ${residentHits.length}`
                    : "Residents"}
                  className={groupClass}
                >
                  {residentHits.slice(0, MAX_RESIDENTS).map((r) => {
                    const waiting = waitingByResident.get(r.id) ?? 0;
                    return (
                      <Command.Item key={r.id} value={`resident-${r.id}`} onSelect={() => openResident(r)} className={itemClass}>
                        <UserRound size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{r.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.unit ? `Unit ${r.unit}` : "No unit"} · {waiting > 0 ? `${plural(waiting, "package")} waiting` : "nothing waiting"}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">View packages</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              {sections.length > 0 && (
                <Command.Group heading="Go to" className={groupClass}>
                  {sections.map((item) => (
                    <Command.Item key={item.label} value={`section-${item.label}`} onSelect={() => run(() => choose(item.label))} className={itemClass}>
                      <item.icon size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {section === item.label && <span className="shrink-0 text-xs text-muted-foreground">Current</span>}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>

            <div className="flex items-center gap-4 border-t border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Kbd className="bg-accent">↑</Kbd><Kbd className="bg-accent">↓</Kbd> Move</span>
              <span className="flex items-center gap-1.5"><Kbd className="bg-accent"><CornerDownLeft size={11} aria-hidden="true" /><span className="sr-only">Enter</span></Kbd> Open</span>
              <span className="ml-auto hidden sm:inline">{plural(allPackages.length, "package")} · {plural(residents.length, "resident")} loaded</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
