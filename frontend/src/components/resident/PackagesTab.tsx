/**
 * Packages tab — every package the front desk is holding for the resident,
 * each with what its status means. Picked-up packages live under Pickups.
 */
import { ArrowRight, Package } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/common";
import { PackageItem } from "./cards";
import { ListError, ListLoading, PageHeader, RefreshError, touchButton } from "./parts";
import type { ResidentData } from "./useResidentData";

export function PackagesTab({ data, onBook }: { data: ResidentData; onBook: () => void }) {
  const { packages, activePackages, availablePackages, upcoming, today } = data;
  const byPackage = new Map(upcoming.map((appointment) => [appointment.package_id, appointment]));

  return (
    <>
      <PageHeader
        title="Packages"
        description="Everything the front desk is holding for you."
        action={availablePackages.length > 0 && (
          <Button className={touchButton} onClick={onBook}>Book a pickup <ArrowRight size={16} aria-hidden="true" /></Button>
        )}
      />

      {!packages.loaded ? (
        packages.error
          ? <ListError title="Could not load your packages" message={packages.error} onRetry={() => void packages.refresh()} busy={packages.loading} />
          : <ListLoading label="Loading your packages…" />
      ) : (
        <>
          {packages.error && <RefreshError message={packages.error} onRetry={() => void packages.refresh()} />}
          {activePackages.length === 0 ? (
            <Card className="max-w-2xl">
              <EmptyState icon={Package} message="No packages waiting for you right now" />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 md:items-start">
              {activePackages.map((pkg) => (
                <PackageItem key={pkg.id} pkg={pkg} appointment={byPackage.get(pkg.id)} today={today} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
