/**
 * Auth screens for Red-E Now.
 *
 * LoginScreen (resident + staff), SignUpScreen (resident only) and RecoveryScreen (password help).
 * All share the AuthFrame layout: the form on the left, and from the lg breakpoint a quiet panel
 * on the right showing the labelled example of the front-desk board.
 *
 * Auth is real: LoginScreen calls signIn (POST /api/auth/login), SignUpScreen calls signUp
 * (POST /api/auth/register). Labels and button names are located by the end-to-end test
 * (e2e/demo.spec.ts); change them there in the same commit if they ever change here.
 */

import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, LoadingSpinner, TextInput, Wordmark, labelClass } from "@/components/common";
import { focusRing, quietLink, textLink } from "@/components/landing/ButtonLink";
import { PickupBoardPreview } from "@/components/landing/PickupBoardPreview";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Role = "resident" | "staff";

/**
 * Demo sign-in hints (seed accounts and the building code). Always on in local
 * development; on a hosted build only when VITE_DEMO_HINTS=true was set at build time.
 */
const SHOW_DEMO_HINTS = import.meta.env.DEV || import.meta.env["VITE_DEMO_HINTS"] === "true";

const DEMO_PASSWORD = "password123";
const DEMO_EMAIL: Record<Role, string> = { resident: "jane@redenow.com", staff: "staff@redenow.com" };
const DEMO_BUILDING_CODE = "REDENOW";

/**
 * Error banner for auth forms. The message is foreground text on the red tint (the red itself
 * is below 4.5:1 as small text in the dark theme); the icon and border carry the colour.
 */
function FormError({ message }: { message: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <p role="alert" className="tint-primary flex items-start gap-2.5 rounded-md border border-primary/40 px-3.5 py-2.5 text-sm leading-snug text-foreground">
            <CircleAlert size={16} aria-hidden="true" className="mt-px shrink-0 text-primary" />
            <span>{message}</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Resident / Front desk switch on the sign-in screens: two links styled as one segmented control. */
function PortalSwitch({ role }: { role: Role }) {
  const item = (active: boolean) => cn(
    "inline-flex h-7 items-center rounded-[5px] px-3 text-[13px] font-medium transition-colors",
    focusRing,
    active
      ? "bg-card text-foreground shadow-[0_0_0_1px_var(--border-strong),0_1px_2px_var(--shadow-tone)]"
      : "text-muted-foreground hover:text-foreground",
  );
  return (
    <nav aria-label="Sign-in type" className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
      <Link to="/login" aria-current={role === "resident" ? "page" : undefined} className={item(role === "resident")}>Resident</Link>
      <Link to="/staff/login" aria-current={role === "staff" ? "page" : undefined} className={item(role === "staff")}>Front desk</Link>
    </nav>
  );
}

/** Demo-only hint box: shows a seed value in mono and fills the form with it. */
function DemoHint({ label, lines, onFill }: { label: string; lines: string[]; onFill: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4 rounded-md border border-border bg-card px-3.5 py-3">
      <div className="min-w-0">
        <p className={labelClass}>{label}</p>
        <p className="mt-1 break-all font-mono text-[12px] leading-relaxed text-foreground/90">
          {lines.map((line) => <span key={line} className="block">{line}</span>)}
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onFill}>Fill in</Button>
    </div>
  );
}

/**
 * Shared layout for every auth screen: form column, and from lg a side panel with the
 * example front-desk board (static sample data, labelled "Example").
 */
function AuthFrame({
  role = "resident",
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  role?: Role;
  eyebrow: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh text-foreground lg:grid-cols-2">
      <div className="flex min-h-dvh flex-col bg-background/70 px-5 sm:px-10 backdrop-blur-sm">
        <header className="flex h-16 shrink-0 items-center gap-4">
          <Wordmark />
        </header>

        <main className="animate-in fade-in fill-mode-both mx-auto my-auto w-full max-w-[380px] py-8 duration-500 sm:py-12">
          {eyebrow}
          <h1 className="mt-5 text-[30px] font-medium leading-[1.08] tracking-[-0.022em] text-foreground sm:text-[34px]">{title}</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">{footer}</div>}
        </main>

        <footer className="flex h-14 shrink-0 items-center text-[13px] text-muted-foreground">
          © {new Date().getFullYear()} Red-E Now
        </footer>
      </div>

      <aside className="sticky top-0 hidden h-dvh flex-col justify-center-safe overflow-hidden border-l border-border bg-muted/30 px-12 py-16 backdrop-blur-sm lg:flex xl:px-16">
        <p className={labelClass}>{role === "staff" ? "The desk console" : "What the front desk sees"}</p>
        <p className="mt-4 max-w-[19ch] text-[32px] font-medium leading-[1.08] tracking-[-0.022em] text-foreground">
          {role === "staff" ? "Every pickup for the day, in time order." : "Your booking goes straight to the desk's board."}
        </p>
        <PickupBoardPreview fade className="mt-12 w-full shrink-0" />
      </aside>
    </div>
  );
}

/**
 * Sign-in form for residents and staff.
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
      eyebrow={<PortalSwitch role={role} />}
      title={role === "staff" ? "Front desk sign in" : "Sign in to Red-E Now"}
      subtitle={role === "staff" ? "Open the desk console for your building." : "See your packages and book a pickup."}
      footer={
        role === "resident" ? (
          <>
            New to your building?{" "}
            <Link to="/signup" className={textLink}>Create an account</Link>
          </>
        ) : (
          <>Staff accounts are set up by your building administrator.</>
        )
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <TextInput
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <TextInput
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2.5 text-right">
            <Link to={role === "staff" ? "/staff/forgot-password" : "/forgot-password"} className={cn(quietLink, "text-sm")}>
              Forgot password?
            </Link>
          </div>
        </div>

        <FormError message={error} />

        <Button type="submit" fullWidth disabled={loading} aria-busy={loading} className="h-11">
          {loading ? <><LoadingSpinner className="size-4 text-current" /> Signing in…</> : "Sign in"}
        </Button>
      </form>

      {/* Demo credentials — local dev, or a hosted demo built with VITE_DEMO_HINTS=true */}
      {SHOW_DEMO_HINTS && (
        <DemoHint
          label="Demo account"
          lines={[DEMO_EMAIL[role], DEMO_PASSWORD]}
          onFill={() => { setEmail(DEMO_EMAIL[role]); setPassword(DEMO_PASSWORD); }}
        />
      )}
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
      eyebrow={<p className={labelClass}>For residents</p>}
      title="Create your account"
      subtitle="You need the building code from your welcome letter or the front desk."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className={textLink}>Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <TextInput label="Full name" name="name" autoComplete="name" required placeholder="Your full name" value={values.name} onChange={set("name")} />
        <TextInput label="Email address" name="email" type="email" autoComplete="email" required placeholder="you@example.com" value={values.email} onChange={set("email")} />

        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Unit number" name="unit" required maxLength={20} placeholder="e.g. 4B" value={values.unit} onChange={set("unit")} />
          <TextInput label="Building code" name="building-code" required maxLength={20} autoCapitalize="characters" autoComplete="off" spellCheck={false} className="font-mono" value={values.building} onChange={set("building")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Password" name="password" type="password" autoComplete="new-password" required helperText="At least 8 characters." value={values.password} onChange={set("password")} />
          <TextInput label="Confirm password" name="confirm-password" type="password" autoComplete="new-password" required value={values.confirm} onChange={set("confirm")} />
        </div>

        <FormError message={error} />

        <Button type="submit" fullWidth disabled={loading} aria-busy={loading} className="h-11">
          {loading ? <><LoadingSpinner className="size-4 text-current" /> Creating account…</> : "Create account"}
        </Button>
      </form>

      {/* Demo building code — same visibility rule as the demo accounts on the sign-in screen */}
      {SHOW_DEMO_HINTS && (
        <DemoHint
          label="Demo building code"
          lines={[DEMO_BUILDING_CODE]}
          onFill={() => setValues((v) => ({ ...v, building: DEMO_BUILDING_CODE }))}
        />
      )}
    </AuthFrame>
  );
}

/**
 * Password help. There is no email provider, so nothing here pretends to send
 * a link. Residents get a temporary password from the front desk (staff issue
 * it from the Residents page); staff go through their administrator.
 */
export function RecoveryScreen({ role }: { role: Role }) {
  const residentSteps = [
    "Go to the front desk and ask for a password reset.",
    "Once they confirm who you are, they give you a temporary password. Your old password stops working straight away.",
    "Sign in with your email address and the temporary password.",
  ];

  return (
    <AuthFrame
      role={role}
      eyebrow={<p className={labelClass}>{role === "staff" ? "Front desk" : "For residents"}</p>}
      title="Password help"
      subtitle={
        role === "staff"
          ? "Staff passwords are reset by your building administrator."
          : "Red-E Now does not send reset links by email. The front desk resets your password in person."
      }
      footer={
        <Link
          to={role === "staff" ? "/staff/login" : "/login"}
          className={cn(focusRing, "inline-flex items-center gap-2 rounded-sm font-medium text-foreground transition-colors hover:text-muted-foreground")}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
        </Link>
      }
    >
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-[15px] font-medium tracking-[-0.01em] text-foreground">What to do</h2>
        {role === "staff" ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Contact the administrator who set up your desk account and ask them to issue a new password.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {residentSteps.map((step, i) => (
              <li key={step} className="flex gap-3.5 text-sm leading-relaxed text-muted-foreground">
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[12px] text-foreground">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AuthFrame>
  );
}
