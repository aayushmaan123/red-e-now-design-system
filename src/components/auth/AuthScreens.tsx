import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { Button, Card, LoadingSpinner, TextInput, Toast } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { SparklesCore } from "@/components/ui/sparkles";
import { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

type Role = "resident" | "staff";

function Wordmark() {
  return <Link to="/" className="font-display text-[31px] font-bold leading-none uppercase text-primary">Red-E Now</Link>;
}

function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  const { isDark } = useTheme();
  return (
    <main className="relative min-h-screen bg-background px-6 py-8 sm:py-12 transition-theme overflow-hidden">
      {isDark && (
        <ParticlesProvider init={async (engine) => { await loadSlim(engine); }}>
          <div className="pointer-events-none absolute inset-0 z-0">
            <SparklesCore
              id="auth-sparkles"
              background="transparent"
              minSize={0.4}
              maxSize={1.2}
              particleDensity={60}
              className="h-full w-full"
              particleColor="#E8344D"
              speed={0.8}
            />
          </div>
        </ParticlesProvider>
      )}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-[440px] flex-col">
        <div className="mb-10 text-center sm:mb-16 animate-fade-in">
          <Wordmark />
        </div>
        <div className="mb-7 text-center animate-fade-in-up">
          <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LockKeyhole size={20} strokeWidth={1.8} />
          </div>
          <h1 className="font-display text-[42px] font-semibold uppercase leading-none text-foreground">{title}</h1>
          <p className="mt-3 text-[15px] text-muted-foreground">{subtitle}</p>
        </div>
        <Card className="p-6 sm:p-8 animate-fade-in-up stagger-1">{children}</Card>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground animate-fade-in stagger-2">{footer}</div>}
        <div className="mt-auto pt-12 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-fade-in stagger-3">
          A better way home · Red-E Now
        </div>
      </div>
    </main>
  );
}

export function LoginScreen({ role }: { role: Role }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const success = await signIn(email, password, role);
    setLoading(false);
    if (success) navigate({ to: role === "staff" ? "/staff/dashboard" : "/dashboard" });
    else setError("That email or password doesn't match this account.");
  };

  return (
    <AuthFrame
      title={role === "staff" ? "Staff sign in" : "Welcome home"}
      subtitle={role === "staff" ? "Management Portal · Sign in to continue" : "Sign in to your resident account."}
      footer={role === "resident"
        ? <>Don't have an account? <Link to="/signup" className="font-medium text-primary hover:underline">Sign Up</Link></>
        : <Link to="/login" className="font-medium text-primary hover:underline">Resident sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        <TextInput label="Email address" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        <div>
          <TextInput label="Password" type="password" autoComplete="current-password" required placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="mt-2 text-right">
            <Link to={role === "staff" ? "/staff/forgot-password" : "/forgot-password"} className="text-xs font-medium text-primary hover:underline transition-colors duration-200">Forgot password?</Link>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive animate-fade-in">{error}</p>}
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? <LoadingSpinner className="text-primary-foreground" /> : <>Sign In <ArrowRight size={17} /></>}
        </Button>
      </form>
      {role === "resident" && (
        <div className="mt-6 animate-fade-in stagger-2">
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">or</span></div>
          </div>
          <div className="space-y-3">
            <button type="button" className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-all duration-200 hover:bg-secondary hover:shadow-sm active:scale-[0.97]">
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button type="button" className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-all duration-200 hover:bg-secondary hover:shadow-sm active:scale-[0.97]">
              <svg viewBox="0 0 24 24" className="size-5" fill="#1877F2" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.388 11.024 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796v8.437C19.612 23.097 24 18.098 24 12.073z"/></svg>
              Continue with Facebook
            </button>
          </div>
        </div>
      )}
      <p className="mt-6 border-t border-border pt-5 text-center text-xs text-muted-foreground">
        Demo: {role === "staff" ? "admin@test.com" : "maya@test.com"} / password123
      </p>
    </AuthFrame>
  );
}

export function SignUpScreen() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({ name: "", email: "", phone: "", unit: "", building: "", password: "", confirm: "" });
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (values.password !== values.confirm) { setError("Passwords do not match."); return; }
    if (values.password.length < 8) { setError("Use at least 8 characters for your password."); return; }
    setError(""); setLoading(true);
    const success = await signUp(values.name.trim(), values.email, values.password);
    setLoading(false);
    if (success) navigate({ to: "/dashboard" });
    else setError("An account with that email already exists.");
  };

  return (
    <AuthFrame title="Create account" subtitle="Join your building's resident community." footer={<>Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign In</Link></>}>
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
        {error && <p role="alert" className="text-sm text-destructive animate-fade-in">{error}</p>}
        <Button type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? <LoadingSpinner className="text-primary-foreground" /> : <>Create Account <ArrowRight size={17} /></>}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function RecoveryScreen({ role }: { role: Role }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 450));
    setLoading(false); setSent(true); setNotice(true);
  };

  return (
    <AuthFrame
      title="Reset password"
      subtitle="Enter your email address to recover your account."
      footer={<Link to={role === "staff" ? "/staff/login" : "/login"} className="inline-flex items-center gap-2 font-medium text-primary hover:underline transition-colors duration-200"><ArrowLeft size={15} /> Back to sign in</Link>}
    >
      {sent ? (
        <div className="py-3 animate-fade-in-up">
          <h2 className="font-display text-2xl font-semibold uppercase">Check your inbox</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            If an account exists for {email}, a reset link would be sent there. Email delivery is not available in this demo.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <TextInput label="Email address" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? <LoadingSpinner className="text-primary-foreground" /> : <>Send Reset Link <ArrowRight size={17} /></>}
          </Button>
        </form>
      )}
      {notice && <Toast kind="info" message="Recovery preview only — no email was sent." onClose={() => setNotice(false)} />}
    </AuthFrame>
  );
}
