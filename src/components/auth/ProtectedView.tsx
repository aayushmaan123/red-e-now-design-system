import { type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { LoadingSpinner } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
export function ProtectedView({ role, children }: { role: "resident" | "staff"; children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>;
  if (user?.role !== role) return <Navigate to={role === "staff" ? "/staff/login" : "/login"} replace />;
  return <>{children}</>;
}
