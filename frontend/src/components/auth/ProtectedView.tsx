/**
 * ProtectedView -- Route guard component for role-based access control.
 *
 * Wraps child routes and checks the authenticated user's role before rendering.
 * - While auth state is still loading, displays a full-screen loading spinner.
 * - If the user's role does not match the required role, redirects to the
 *   appropriate login page (staff -> /staff/login, resident -> /login).
 * - If the role matches, renders the child routes normally.
 */

import { type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { LoadingSpinner } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
export function ProtectedView({ role, children }: { role: "resident" | "staff"; children: ReactNode }) {
  const { user, ready } = useAuth();

  // Auth state hasn't resolved yet -- show a centered loading spinner
  // so the user doesn't see a flash of the wrong page.
  if (!ready) return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>;

  // User is either not logged in or has a different role than required.
  // Redirect them to the correct login page for the expected role.
  if (user?.role !== role) return <Navigate to={role === "staff" ? "/staff/login" : "/login"} replace />;

  // Role matches -- render the protected child routes.
  return <>{children}</>;
}
