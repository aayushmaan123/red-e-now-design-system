import { createFileRoute } from "@tanstack/react-router";
import { ProtectedView } from "@/components/auth/ProtectedView";
import { ResidentHome } from "@/components/resident/ResidentHome";
export const Route = createFileRoute("/dashboard")({ head: () => ({ meta: [{ title: "Resident Dashboard | Red-E Now" }, { name: "description", content: "View your packages, pickups, and resident activity." }, { property: "og:title", content: "Resident Dashboard | Red-E Now" }, { property: "og:description", content: "Manage your residential packages and pickups." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: () => <ProtectedView role="resident"><ResidentHome /></ProtectedView> });
