import { createFileRoute } from "@tanstack/react-router";
import { ProtectedView } from "@/components/auth/ProtectedView";
import { StaffDashboard } from "@/components/dashboard/StaffDashboard";
export const Route = createFileRoute("/staff/dashboard")({ head: () => ({ meta: [{ title: "Management Dashboard | Red-E Now" }, { name: "description", content: "Manage building packages, pickups, and resident operations." }, { property: "og:title", content: "Management Dashboard | Red-E Now" }, { property: "og:description", content: "Red-E Now building management overview." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: () => <ProtectedView role="staff"><StaffDashboard /></ProtectedView> });
