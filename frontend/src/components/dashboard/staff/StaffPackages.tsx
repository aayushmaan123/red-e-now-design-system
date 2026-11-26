/**
 * StaffPackages — package table with search, status filter, sort.
 */
import { Table, SearchField, StatusBadge, formatArrived } from "@/components/common";
import { useStaff, STATUS_OPTIONS } from "./StaffContext";
import type { PackageRecord, PackageStatus } from "@/api/packagesApi";
import type { Column } from "@/components/common";
import { ErrorNote, LoadError, PageHeader } from "./ui";

const pkgColumns: Column<PackageRecord>[] = [
  { key: "carrier_name", header: "Carrier" },
  { key: "tracking_code", header: "Tracking" },
  { key: "resident_name", header: "Resident" },
  {
    key: "status",
    header: "Status",
    render: (row: PackageRecord) => <StatusBadge status={row.status} />,
  },
  {
    key: "arrived_at",
    header: "Arrived",
    render: (row: PackageRecord) => <span className="text-muted-foreground">{formatArrived(row.arrived_at)}</span>,
  },
];

export function StaffPackages() {
  const {
    packages, loading, packagesLoaded, packagesError, fetchPackages,
    searchQ, setSearchQ,
    statusFilter, setStatusFilter,
    sortKey, sortDir, sortedPackages, handleSort,
    setDrawerPkg,
  } = useStaff();

  return (
    <>
      <PageHeader
        title="Packages"
        description={`${packages.length} package${packages.length !== 1 ? "s" : ""} in the system`}
      />

      {packagesLoaded && packagesError && (
        <ErrorNote className="mb-4" onRetry={fetchPackages}>
          Packages could not be refreshed: {packagesError}
        </ErrorNote>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchField
            value={searchQ}
            onChange={setSearchQ}
            placeholder="Search name, tracking, carrier, location…"
            debounceMs={300}
          />
        </div>
        <label className="sr-only" htmlFor="pkg-status-filter">Filter by status</label>
        <select
          id="pkg-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PackageStatus | "")}
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {!packagesLoaded && packagesError ? (
        <LoadError title="Could not load packages" message={packagesError} onRetry={fetchPackages} busy={loading} />
      ) : (
        <Table<PackageRecord>
          columns={pkgColumns}
          data={sortedPackages}
          keyExtractor={(r) => String(r.id)}
          {...(sortKey ? { sortKey } : {})}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(r) => setDrawerPkg(r)}
          emptyMessage={loading ? "Loading packages…" : "No packages found"}
        />
      )}
    </>
  );
}
