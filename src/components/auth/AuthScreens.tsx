import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { Button, Card, LoadingSpinner, TextInput, Toast } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";

type Role = "resident" | "staff";

function Wordmark() {
  return <Link to="/" className="font-display text-[31px] font-bold leading-none uppercase text-primary">Red-E Now<span className="ml-0.5 text-foreground">.</span></Link>;
}

function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-6 py-8 sm:py-12 transition-theme">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[440px] flex-col">
        <div className="mb-12 flex items-center justify-between sm:mb-20 animate-fade-in">
          <Wordmark />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Residential services</span>
        </div>
        <div className="mb-7 animate-fade-in-up">
          <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
