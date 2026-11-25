/**
 * StaffResidents — directory of residents with their package counts.
 * Data: GET /api/residents (loaded in StaffContext) + the staff package list.
 * Clicking a resident opens Packages filtered to their name.
 */
import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { EmptyState, SearchField, Table, type Column } from "@/components/common";
import { useStaff } from "./StaffContext";

type ResidentRow = {
  id: number;
  name: string;
  unit: string | null;
  waiting: number;
  total: number;
};

export function StaffResidents() {
  const { residents, residentsError, packages, choose, setSearchQ, setStatusFilter } = useStaff();
  const [query, setQuery] = useState("");

  const rows = useMemo<ResidentRow[]>(() => {
    const counts = new Map<number, { waiting: number; total: number }>();
    for (const p of packages) {
      const c = counts.get(p.resident_id) ?? { waiting: 0, total: 0 };
      c.total += 1;
      if (p.status !== "picked_up") c.waiting += 1;
      counts.set(p.resident_id, c);
    }
    const q = query.trim().toLowerCase();
    return residents
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.unit ?? "").toLowerCase().includes(q))
      .map((r) => ({ ...r, ...(counts.get(r.id) ?? { waiting: 0, total: 0 }) }));
  }, [residents, packages, query]);

  const columns: Column<ResidentRow>[] = [
    { key: "name", header: "Resident", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "unit", header: "Unit", render: (r) => <span className="font-mono text-[13px]">{r.unit || "—"}</span> },
    {
      key: "waiting",
      header: "Waiting",
      align: "right",
      render: (r) => (
        <span className={r.waiting ? "tabular-nums text-foreground" : "tabular-nums text-muted-foreground"}>{r.waiting}</span>
      ),
    },
    { key: "total", header: "All packages", align: "right", render: (r) => <span className="tabular-nums text-muted-foreground">{r.total}</span> },
  ];

  const openPackages = (r: ResidentRow) => {
    setStatusFilter("");
    setSearchQ(r.name);
    choose("Packages");
  };

  return (
    <>
      <div className="mb-7 animate-fade-in">
        <h1 className="font-display text-[38px] font-semibold leading-none">Residents</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {residents.length} resident{residents.length !== 1 ? "s" : ""} registered. Select one to see their packages.
        </p>
      </div>

      <div className="mb-5 animate-fade-in">
        <SearchField value={query} onChange={setQuery} placeholder="Search name or unit…" />
      </div>

      {residentsError ? (
        <p role="alert" className="tint-primary rounded-md px-3.5 py-2.5 text-sm text-primary">{residentsError}</p>
      ) : residents.length === 0 ? (
        <EmptyState icon={Users} title="No residents yet" message="Residents appear here once they sign up with the building code." />
      ) : (
        <Table
          columns={columns}
          data={rows}
          keyExtractor={(r) => String(r.id)}
          onRowClick={openPackages}
          emptyMessage="No residents match that search."
        />
      )}
    </>
  );
}
