/**
 * StaffResidents — directory of residents with their package counts.
 * Data: GET /api/residents (loaded in StaffContext) + the staff package list.
 * Clicking a resident opens Packages filtered to their name.
 * "Reset password" issues a temporary password (POST /api/residents/:id/reset-password)
 * for a resident who is locked out; it is shown once and handed over at the desk.
 */
import { useMemo, useState } from "react";
import { Check, Copy, KeyRound, Users } from "lucide-react";
import { Button, EmptyState, Modal, SearchField, Table, type Column } from "@/components/common";
import { resetResidentPassword } from "@/api/residentsApi";
import { useStaff } from "./StaffContext";

type ResidentRow = {
  id: number;
  name: string;
  email?: string;
  unit: string | null;
  waiting: number;
  total: number;
};

/** Confirm → issue → show-once dialog for a staff-issued temporary password. */
function ResetPasswordDialog({ resident, onClose }: { resident: ResidentRow; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const issue = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await resetResidentPassword(resident.id);
      setTemporaryPassword(result.temporary_password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      setError("Could not copy. Select the password and copy it manually.");
    }
  };

  const who = `${resident.name}${resident.unit ? ` (Unit ${resident.unit})` : ""}`;

  return (
    <Modal
      title={temporaryPassword ? "Temporary password" : "Reset password"}
      onClose={() => { if (!busy) onClose(); }}
      actions={
        temporaryPassword ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={issue} disabled={busy}>{busy ? "Resetting…" : "Reset password"}</Button>
          </>
        )
      }
    >
      {temporaryPassword ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Give this to {who} in person. It is shown once and cannot be retrieved later.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3.5 py-3">
            <code className="select-all break-all font-mono text-base text-foreground">{temporaryPassword}</code>
            <Button variant="secondary" size="sm" onClick={copy} className="shrink-0 gap-1.5">
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {resident.email ? <>They sign in as <span className="font-mono text-[13px] text-foreground">{resident.email}</span> with this password.</> : "They sign in with their email and this password."}
          </p>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          Issue a temporary password for <span className="font-medium text-foreground">{who}</span>? Their current password stops working right away. Confirm who they are before you hand it over.
        </p>
      )}
      {error && <p role="alert" className="tint-primary mt-4 rounded-md px-3.5 py-2.5 text-sm text-primary">{error}</p>}
    </Modal>
  );
}

export function StaffResidents() {
  const { residents, residentsError, packages, choose, setSearchQ, setStatusFilter } = useStaff();
  const [query, setQuery] = useState("");
  const [resetTarget, setResetTarget] = useState<ResidentRow | null>(null);

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
    {
      key: "actions",
      header: "Account",
      align: "right",
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label={`Reset password for ${r.name}`}
          onClick={(e) => { e.stopPropagation(); setResetTarget(r); }}
        >
          <KeyRound size={14} /> Reset password
        </Button>
      ),
    },
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

      {resetTarget && <ResetPasswordDialog resident={resetTarget} onClose={() => setResetTarget(null)} />}
    </>
  );
}
