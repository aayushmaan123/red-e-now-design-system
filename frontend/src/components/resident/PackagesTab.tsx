/**
 * Packages tab — every package the front desk is holding for the resident,
 * with search, status filters and context actions. Picked-up packages are
 * included when the filter asks for them.
 */
import { useMemo, useState } from "react";
import { ArrowRight, Package } from "lucide-react";
import type { PackageStatus } from "@/api/packagesApi";
import { Button, Card, EmptyState } from "@/components/common";
import { PackageItem } from "./cards";
import { ListError, ListLoading, PageHeader, RefreshError, touchButton } from "./parts";
import { FilterChips, ResidentSearch } from "./ui";
import type { ResidentData } from "./useResidentData";

type FilterId = "all" | "received" | "available" | "prepared" | "picked_up";

const FILTERS: readonly { id: FilterId; label: string; status?: PackageStatus }[] = [
  { id: "all", label: "All" },
  { id: "received", label: "Received", status: "received" },
  { id: "available", label: "Available", status: "available" },
  { id: "prepared", label: "Prepared", status: "prepared" },
  { id: "picked_up", label: "Picked up", status: "picked_up" },
];

export function PackagesTab({
  data,
  onBook,
  onOpenPickups,
}: {
  data: ResidentData;
  onBook: () => void;
  onOpenPickups: () => void;
}) {
  const { packages, availablePackages, upcoming, today } = data;
  const byPackage = new Map(upcoming.map((appointment) => [appointment.package_id, appointment]));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const counts = useMemo(() => {
    const next: Record<FilterId, number> = {
      all: packages.items.length,
      received: 0,
      available: 0,
      prepared: 0,
      picked_up: 0,
    };
    for (const pkg of packages.items) {
      if (pkg.status === "received") next.received += 1;
      else if (pkg.status === "available") next.available += 1;
      else if (pkg.status === "prepared" || pkg.status === "scheduled") next.prepared += 1;
      else if (pkg.status === "picked_up") next.picked_up += 1;
    }
    return next;
  }, [packages.items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packages.items.filter((pkg) => {
      if (filter === "received" && pkg.status !== "received") return false;
      if (filter === "available" && pkg.status !== "available") return false;
      if (filter === "prepared" && pkg.status !== "prepared" && pkg.status !== "scheduled") return false;
      if (filter === "picked_up" && pkg.status !== "picked_up") return false;
      if (!q) return true;
      return (
        pkg.carrier_name.toLowerCase().includes(q)
        || pkg.tracking_code.toLowerCase().includes(q)
        || (pkg.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [packages.items, filter, query]);

  const chipOptions = FILTERS.map((f) => ({
    id: f.id,
    label: f.label,
    count: counts[f.id],
  }));

  return (
    <>
      <PageHeader
        title="Packages"
        description={`${packages.loaded ? packages.items.length : "—"} package${packages.loaded && packages.items.length === 1 ? "" : "s"} on record.`}
        action={availablePackages.length > 0 && (
          <Button className={touchButton} onClick={onBook}>
            Book a pickup <ArrowRight size={16} aria-hidden="true" />
          </Button>
        )}
      />

      {!packages.loaded ? (
        packages.error
          ? <ListError title="Could not load your packages" message={packages.error} onRetry={() => void packages.refresh()} busy={packages.loading} />
          : <ListLoading label="Loading your packages…" />
      ) : (
        <div className="space-y-4">
          {packages.error && <RefreshError message={packages.error} onRetry={() => void packages.refresh()} />}
          <ResidentSearch value={query} onChange={setQuery} placeholder="Search carrier or tracking" />
          <FilterChips options={chipOptions} value={filter} onChange={setFilter} />

          {packages.items.length === 0 ? (
            <Card className="rounded-2xl">
              <EmptyState icon={Package} title="No packages yet" message="Packages appear here once the front desk logs a delivery for you." />
            </Card>
          ) : visible.length === 0 ? (
            <Card className="rounded-2xl">
              <EmptyState
                icon={Package}
                title="No matches"
                message={query ? "Nothing matches that search." : "No packages in this status."}
              />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 md:items-start">
              {visible.map((pkg) => (
                <PackageItem
                  key={pkg.id}
                  pkg={pkg}
                  appointment={byPackage.get(pkg.id)}
                  today={today}
                  onBook={onBook}
                  onOpenPickup={onOpenPickups}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
