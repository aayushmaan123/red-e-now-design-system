/**
 * Auth screen components for Red-E Now.
 *
 * Contains LoginScreen (resident + staff), SignUpScreen (resident only),
 * and RecoveryScreen (password reset).
 * All screens share the AuthFrame layout wrapper.
 *
 * Business logic and API calls are UNCHANGED.
 */

import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, LoadingSpinner, TextInput, ThemeTabs, Wordmark, labelClass } from "@/components/common";
import { PickupBoardPreview } from "@/components/landing/PickupBoardPreview";
import { useAuth } from "@/hooks/useAuth";

type Role = "resident" | "staff";

/** Inline text link used across auth screens: foreground text, underline turns red on hover. */
const textLink = "font-semibold text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm";

/** Error banner for auth forms (red tint, matches DESIGN.md status treatment). */
function FormError({ message }: { message: string }) {
  return <AnimatePresence>
    {message && (
      <motion.p
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        role="alert"
        className="tint-primary rounded-md px-3.5 py-2.5 text-sm text-primary"
      >
        {message}
      </motion.p>
    )}
  </AnimatePresence>;
}

/**
 * Shared layout wrapper for all auth screens — form column on the left; on large screens a hero panel
 * on the right with the live example pickup board (the only place besides the landing hero that uses
 * rim light / streaks / dots, per DESIGN.md).
 */
function AuthFrame({
  role = "resident",
  title,
  subtitle,
  children,
  footer,
}: {
  role?: Role;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Form column */}
      <div className="flex min-h-screen flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between gap-4">
          <Wordmark />
          <div className="flex items-center gap-3">
            <ThemeTabs compact />
            <Link to={role === "staff" ? "/login" : "/staff/login"} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {role === "staff" ? "Resident sign in" : "Staff portal"}
            </Link>
          </div>
        </header>

        <div className="mx-auto my-auto w-full max-w-[400px] py-12">
          <p className={labelClass}>{role === "staff" ? "Front desk" : "Residents"}</p>
          <h1 className="mt-3 font-display text-[40px] font-medium leading-[0.95] tracking-[-0.022em] text-foreground">
            {title}
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">© {new Date().getFullYear()} Red-E Now</p>
      </div>

      {/* Hero panel (lg+) */}
      <aside className="relative isolate hidden flex-col justify-center overflow-hidden border-l border-border px-12 py-16 lg:flex xl:px-20">
        <div aria-hidden="true" className="dot-field" />
        <div aria-hidden="true" className="hero-streaks"><i /><i /><i /><i /></div>
        <p className={labelClass}>{role === "staff" ? "Today at the desk" : "Ready when you are"}</p>
        <p className="mt-3 max-w-[18ch] font-display text-3xl font-medium leading-none tracking-[-0.01em]">
          {role === "staff" ? "Every pickup, one board." : "Your packages, pulled before you arrive."}
        </p>
        <PickupBoardPreview className="mt-10 w-full max-w-[560px]" />
      </aside>
    </main>
  );
}

/**
 * Login form for both resident and staff roles.
 * Uses real auth (AuthContext signIn) — calls POST /api/auth/login.
 */
export function LoginScreen({ role }: { role: Role }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signIn(email, password);
      navigate({ to: user.role === "staff" ? "/staff/dashboard" : "/dashboard" });
    } catch (err: any) {
      setError(err?.message || "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      role={role}
      title={role === "staff" ? "Staff sign in" : "Welcome home"}
      subtitle={
        role === "staff"
          ? "Sign in to the desk console."
          : "Sign in to see your packages and book a pickup."
      }
      footer={
        role === "resident" ? (
          <>
            New to your building?{" "}
            <Link to="/signup" className={textLink}>
              Create an account
            </Link>
          </>
        ) : (
          <>
            Not on staff?{" "}
            <Link to="/login" className={textLink}>
              Resident sign in
            </Link>
          </>
        )
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <TextInput
            label="Email address"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <TextInput
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 text-right">
            <Link
              to={role === "staff" ? "/staff/forgot-password" : "/forgot-password"}
              className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <FormError message={error} />

        <div>
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? (
              <LoadingSpinner className="text-primary-foreground" />
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Demo credentials — local development builds only */}
      {import.meta.env.DEV && <div className="mt-6 rounded-md border border-border bg-card px-3.5 py-3">
        <p className={labelClass}>Demo accounts</p>
        <p className="mt-1.5 font-mono text-[12px] leading-relaxed text-muted-foreground">
          staff@redenow.com · jane@redenow.com<br />password123
        </p>
      </div>}
    </AuthFrame>
  );
}

/**
 * Resident account creation form.
 * Collects name, email, unit, building code, password → POST /api/auth/register.
 */
export function SignUpScreen() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({
    name: "",
    email: "",
    unit: "",
    building: "",
    password: "",
    confirm: "",
  });
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (values.password !== values.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (values.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        unit: values.unit.trim(),
        buildingCode: values.building.trim(),
      });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title="Create account"
      subtitle="Use the building code from your welcome letter or the front desk."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className={textLink}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <TextInput label="Full name" autoComplete="name" required placeholder="Your full name" value={values.name} onChange={set("name")} />
        <TextInput label="Email address" type="email" autoComplete="email" required placeholder="you@example.com" value={values.email} onChange={set("email")} />

        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Unit number" required maxLength={20} placeholder="e.g. 4B" value={values.unit} onChange={set("unit")} />
          <TextInput label="Building code" required maxLength={20} autoCapitalize="characters" placeholder="From the front desk" value={values.building} onChange={set("building")} />
        </div>
        <TextInput label="Password" type="password" autoComplete="new-password" required placeholder="At least 8 characters" value={values.password} onChange={set("password")} />
        <TextInput label="Confirm password" type="password" autoComplete="new-password" required placeholder="Repeat password" value={values.confirm} onChange={set("confirm")} />

        <FormError message={error} />

        <Button type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? (
            <LoadingSpinner className="text-primary-foreground" />
          ) : (
            <>
              Create account <ArrowRight size={17} />
            </>
          )}
        </Button>
      </form>
    </AuthFrame>
  );
}

/**
 * Password help. Self-service email reset needs an email provider, which the
 * MVP does not have yet, so this screen tells people the real path instead of
 * pretending to send a link.
 */
export function RecoveryScreen({ role }: { role: Role }) {
  return (
    <AuthFrame
      role={role}
      title="Reset password"
      subtitle={
        role === "staff"
          ? "Staff passwords are reset by your building administrator."
          : "Self-service password reset is not available yet."
      }
      footer={
        <Link
          to={role === "staff" ? "/staff/login" : "/login"}
          className="inline-flex items-center gap-2 rounded-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      }
    >
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-foreground">
          What to do
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {role === "staff"
            ? "Contact the administrator who set up your desk account and ask them to issue a new password."
            : "Contact your building management for help getting back into your account. Emailed reset links are coming in a later release."}
        </p>
      </div>
    </AuthFrame>
  );
}
