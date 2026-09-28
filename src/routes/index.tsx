import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Red-E Now | Resident Services" }, { name: "description", content: "Sign in to Red-E Now for residential package and pickup services." }, { property: "og:title", content: "Red-E Now | Resident Services" }, { property: "og:description", content: "Residential package and pickup services, all in one place." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <Navigate to="/login" replace />,
});
