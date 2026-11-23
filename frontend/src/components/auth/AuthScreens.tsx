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
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, LoadingSpinner, TextInput, Toast, Wordmark, labelClass } from "@/components/common";
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
          <Link to={role === "staff" ? "/login" : "/staff/login"} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {role === "staff" ? "Resident sign in" : "Staff portal"}
          </Link>
        </header>

        <div className="mx-auto my-auto w-full max-w-[400px] py-12">
          <p className={labelClass}>{role === "staff" ? "Front desk" : "Residents"}</p>
          <h1 className="mt-3 font-display text-[40px] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-foreground">
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
        <p className="mt-3 max-w-[18ch] font-display text-3xl font-medium uppercase leading-none tracking-[-0.01em]">
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

      {/* Social login — resident only */}
      {role === "resident" && (
        <div className="mt-6">
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className={`bg-background px-3 ${labelClass}`}>
                or
              </span>
            </div>
          </div>

          {/* Social login placeholders — not functional in MVP */}
          <div className="space-y-3">
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-md bg-muted text-[15px] font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-md bg-muted text-[15px] font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.388 11.024 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796v8.437C19.612 23.097 24 18.098 24 12.073z" />
              </svg>
              Continue with Facebook
            </button>
          </div>
        </div>
      )}

      {/* Demo credentials */}
      <div className="mt-6 rounded-md border border-border bg-card px-3.5 py-3">
        <p className={labelClass}>Demo accounts</p>
        <p className="mt-1.5 font-mono text-[12px] leading-relaxed text-muted-foreground">
          staff@redenow.com · jane@redenow.com<br />password123
        </p>
      </div>
    </AuthFrame>
  );
}

/**
 * Resident account creation form.
 * Collects name, email, phone, unit, building code, password.
 */
export function SignUpScreen() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
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
      const success = await signUp(values.name.trim(), values.email, values.password);
      if (success) navigate({ to: "/dashboard" });
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
          <TextInput label="Phone" type="tel" autoComplete="tel" required placeholder="(555) 000-0000" value={values.phone} onChange={set("phone")} />
          <TextInput label="Unit number" required placeholder="e.g. 4B" value={values.unit} onChange={set("unit")} />
        </div>

        <TextInput label="Building code" required placeholder="Enter your code" value={values.building} onChange={set("building")} />
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
 * Password recovery flow — currently a demo-only placeholder.
 */
export function RecoveryScreen({ role }: { role: Role }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    setLoading(false);
    setSent(true);
    setNotice(true);
  };

  return (
    <AuthFrame
      role={role}
      title="Reset password"
      subtitle="Enter the email on your account and we'll send a reset link."
      footer={
        <Link
          to={role === "staff" ? "/staff/login" : "/login"}
          className="inline-flex items-center gap-2 rounded-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      }
    >
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-md border border-border bg-card p-5"
          >
            <div className="flex items-center gap-2.5 text-success-foreground">
              <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold uppercase tracking-[0.02em] text-foreground">
                Check your inbox
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              If an account exists for{" "}
              <span className="font-medium text-foreground">{email}</span>, a reset link would be
              sent there. Email delivery is not available in this demo.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <TextInput
              label="Email address"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? (
                <LoadingSpinner className="text-primary-foreground" />
              ) : (
                <>
                  Send reset link <ArrowRight size={17} />
                </>
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {notice && (
        <Toast kind="info" message="Recovery preview only — no email was sent." onClose={() => setNotice(false)} />
      )}
    </AuthFrame>
  );
}
