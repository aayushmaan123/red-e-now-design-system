/* Dev-only design-system gallery (/design) — every common component on the v4 tokens. 404s in production builds. */
import { useEffect, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Clock3, Inbox, Package, PackageCheck, TriangleAlert } from "lucide-react";
import {
  AppointmentCard, Avatar, Badge, Button, Card, DeviceFrame, EmptyState, Kbd, KpiStrip, PackageCard,
  SearchField, SectionHeader, StatCard, StatusBadge, Table, TextInput, labelClass, type Column,
} from "@/components/common";

export const Route = createFileRoute("/design")({
  beforeLoad: () => { if (!import.meta.env.DEV) throw notFound(); },
  head: () => ({ meta: [{ title: "Design System | Red-E Now" }] }),
  component: DesignGallery,
});

type Row = { id: string; tracking: string; carrier: string; resident: string; unit: string; arrived: string; status: "received" | "available" | "scheduled" | "prepared" | "picked_up" };
const rows: Row[] = [
  { id: "1", tracking: "1Z 84F 2W7 03 4419 2207", carrier: "UPS", resident: "D. Alvarez", unit: "12B", arrived: "09:14", status: "available" },
  { id: "2", tracking: "TBA 3092 7781 0045", carrier: "Amazon", resident: "S. Nakamura", unit: "4F", arrived: "10:02", status: "prepared" },
  { id: "3", tracking: "9400 1118 9922 3409 1176 55", carrier: "USPS", resident: "R. Okafor", unit: "7A", arrived: "11:47", status: "scheduled" },
  { id: "4", tracking: "7731 2209 4416", carrier: "FedEx", resident: "M. Haddad", unit: "21C", arrived: "12:30", status: "received" },
];
const columns: Column<Row>[] = [
  { key: "tracking", header: "Tracking", render: r => <span className="font-mono text-[13px]">{r.tracking}</span> },
  { key: "carrier", header: "Carrier", sortable: true },
  { key: "resident", header: "Resident", sortable: true, render: r => <>{r.resident} <span className="font-mono text-muted-foreground">· {r.unit}</span></> },
  { key: "arrived", header: "Arrived", render: r => <span className="font-mono text-muted-foreground">{r.arrived}</span> },
  { key: "status", header: "Status", render: r => <StatusBadge status={r.status} /> },
];
const board = [
  { slot: "14:30", unit: "12B", name: "D. Alvarez", pkgs: 3, badge: <Badge tone="success">Ready</Badge> },
  { slot: "14:30", unit: "4F", name: "S. Nakamura", pkgs: 1, badge: <Badge tone="info">Checked in</Badge> },
  { slot: "14:45", unit: "7A", name: "R. Okafor", pkgs: 2, badge: <Badge tone="prepared">Prepping</Badge> },
  { slot: "13:15", unit: "9D", name: "L. Brennan", pkgs: 1, badge: <Badge tone="alert">Overdue</Badge> },
];

function DesignGallery() {
  const [search, setSearch] = useState("");
  const [kpi, setKpi] = useState({ waiting: 128, today: 37, prepared: 19, handed: 1284 });
  useEffect(() => {
    const t = setInterval(() => setKpi(k => ({ waiting: k.waiting + (Math.random() < 0.5 ? -1 : 2), today: k.today + (Math.random() < 0.4 ? 1 : 0), prepared: k.prepared, handed: k.handed + 1 + Math.floor(Math.random() * 3) })), 2600);
    return () => clearInterval(t);
  }, []);

  return <main className="mx-auto max-w-6xl space-y-12 px-6 py-10">
    <SectionHeader eyebrow="Design system v4" title="Bold Dark Ops" />

    <section className="space-y-4">
      <p className={labelClass}>Buttons</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button>Book a pickup</Button>
        <Button>Start handoff <Kbd>H</Kbd></Button>
        <Button variant="secondary">Register package</Button>
        <Button variant="ghost">Export</Button>
        <Button variant="destructive">Cancel pickup</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
      </div>
    </section>

    <section className="space-y-4">
      <p className={labelClass}>Badges</p>
      <div className="flex flex-wrap gap-2">
        {(["received", "available", "scheduled", "prepared", "picked_up"] as const).map(s => <StatusBadge key={s} status={s} />)}
        <Badge tone="alert">Overdue</Badge>
        <Badge tone="info">Checked in</Badge>
      </div>
    </section>

    <section className="space-y-4">
      <p className={labelClass}>KPI strip (rolling numerals)</p>
      <KpiStrip>
        <StatCard variant="strip" icon={Inbox} label="Waiting" value={kpi.waiting} trend="up" trendLabel="12 since 9:00" />
        <StatCard variant="strip" icon={Clock3} label="Today's pickups" value={kpi.today} trend="neutral" trendLabel="9 remaining" />
        <StatCard variant="strip" icon={PackageCheck} label="Prepared" value={kpi.prepared} />
        <StatCard variant="strip" icon={TriangleAlert} label="Overdue" value={3} tone="alert" trend="down" trendLabel="oldest 41 min" />
      </KpiStrip>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={Package} label="Handed off today" value={kpi.handed} />
        <StatCard icon={Clock3} label="Avg. wait at desk" value="1m 40s" />
      </div>
    </section>

    <section className="space-y-4">
      <p className={labelClass}>Table + search</p>
      <SearchField value={search} onChange={setSearch} placeholder="Search packages" className="max-w-xs" />
      <Table columns={columns} data={rows.filter(r => !search || `${r.tracking} ${r.resident} ${r.unit}`.toLowerCase().includes(search.toLowerCase()))} keyExtractor={r => r.id} onRowClick={() => {}} sortKey="carrier" sortDir="asc" onSort={() => {}} />
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      <PackageCard carrierName="UPS" trackingCode="1Z 84F 2W7 03 4419 2207" status="available" arrivedAt="Today, 09:14" recipientName="D. Alvarez" recipientUnit="12B" onClick={() => {}} />
      <AppointmentCard date="Thu, Nov 26" timeSlot="14:30 – 14:45" packageCount={3} status="scheduled" onAction={() => {}} actionLabel="Cancel" />
      <Card><EmptyState icon={Inbox} title="No packages" message="New deliveries for your unit will show up here." action={<Button variant="secondary" size="sm">Refresh</Button>} /></Card>
    </section>

    <section className="grid gap-6 md:grid-cols-2">
      <Card className="space-y-4 p-5">
        <TextInput label="Email address" placeholder="you@example.com" />
        <TextInput label="Unit" placeholder="12B" error="That unit isn't registered in Tower A." />
        <div className="flex items-center gap-3"><Avatar name="Dana Alvarez" /><Avatar name="Sam Nakamura" /></div>
      </Card>
      <div className="relative overflow-hidden rounded-lg border border-border p-8 isolate">
        <div className="dot-field" />
        <div className="hero-streaks"><i /><i /><i /><i /></div>
        <DeviceFrame>
          <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-3">
            <span className={labelClass}>Pickup board · Today</span>
            <span className="font-mono text-[13px]">14:32</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {board.map(b => <tr key={b.unit} className="border-t border-border first:border-t-0">
                <td className="h-10 px-4 font-mono">{b.slot}</td>
                <td className="px-2 font-display text-base font-semibold">{b.unit}</td>
                <td className="px-2">{b.name}</td>
                <td className="px-2 font-mono text-muted-foreground">{b.pkgs}</td>
                <td className="px-4 text-right">{b.badge}</td>
              </tr>)}
            </tbody>
          </table>
        </DeviceFrame>
      </div>
    </section>
  </main>;
}
