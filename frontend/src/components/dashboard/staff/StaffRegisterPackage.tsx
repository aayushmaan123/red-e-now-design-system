/**
 * StaffRegisterPackage — form to log a new package arrival.
 * Glassmorphism card with premium dark-mode styling.
 */
import { Card, Button, TextInput } from "@/components/common";
import { useStaff, CARRIERS } from "./StaffContext";

export function StaffRegisterPackage() {
  const {
    regCarrier, setRegCarrier, regTracking, setRegTracking,
    residents, residentsError, regResidentId, setRegResidentId,
    regLocation, setRegLocation, regDescription, setRegDescription,
    regLoading, regSuccess, regError, handleRegister,
  } = useStaff();

  return (
    <>
      <div className="mb-7 animate-fade-in">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Oakwood Residences / Management
        </p>
        <h1 className="font-display text-[38px] font-semibold uppercase leading-none">
          Register Package
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Log a new package that arrived at the building.
        </p>
      </div>

      <Card className="max-w-xl animate-fade-in bg-card border-border">
        <form onSubmit={handleRegister} className="space-y-5 p-6">
          {/* Carrier */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Carrier <span className="text-primary">*</span>
            </label>
            <select
              value={regCarrier}
              onChange={(e) => setRegCarrier(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Tracking code */}
          <TextInput
            label="Tracking Code"
            value={regTracking}
            onChange={(e) => setRegTracking(e.target.value)}
            placeholder="e.g. 1Z999AA10123456784"
            required
          />

          {/* Resident */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Resident <span className="text-primary">*</span>
            </label>
            <select
              value={regResidentId}
              onChange={(e) => setRegResidentId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Choose a resident</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — Unit {r.unit || "Not assigned"}
                </option>
              ))}
            </select>
            {residentsError && (
              <p className="mt-1 text-xs text-destructive">{residentsError}</p>
            )}
          </div>

          {/* Storage location */}
          <TextInput
            label="Storage Location"
            value={regLocation}
            onChange={(e) => setRegLocation(e.target.value)}
            placeholder="e.g. SHELF-A1"
            required
          />

          {/* Description */}
          <TextInput
            label="Description"
            value={regDescription}
            onChange={(e) => setRegDescription(e.target.value)}
            placeholder="e.g. Small box, Large envelope"
          />

          {/* Error / Success */}
          {regError && <p className="text-sm text-primary">{regError}</p>}
          {regSuccess && <p className="text-sm text-success">Package registered successfully!</p>}

          {/* Submit */}
          <Button type="submit" fullWidth disabled={regLoading}>
            {regLoading ? "Registering…" : "Register Package"}
          </Button>
        </form>
      </Card>
    </>
  );
}
