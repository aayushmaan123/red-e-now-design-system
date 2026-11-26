/* Landing page: what Red-E Now does, for residents and for the front desk. */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList, History, ListOrdered,
  Package, PackagePlus, Receipt, RefreshCw, Smartphone, UserCheck,
} from "lucide-react";
import { ThemeTabs, Wordmark, labelClass } from "@/components/common";
import { ButtonLink, focusRing, quietLink } from "@/components/landing/ButtonLink";
import { PickupBoardPreview } from "@/components/landing/PickupBoardPreview";
import { Reveal, StackingSteps, type Step } from "@/components/landing/ScrollSections";
import { FeatureGrid, SectionHeading, container, sectionTitle, type Feature } from "@/components/landing/Sections";
import { ArrivesVignette, HandoffVignette, SlotVignette } from "@/components/landing/StepVignettes";
import { TextAnimate } from "@/components/ui/text-animate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Red-E Now | Package pickup, by appointment" },
      { name: "description", content: "Residents book a pickup slot for their packages. The front desk sees every booking, prepares the packages and records a verified handoff." },
      { property: "og:title", content: "Red-E Now | Package pickup, by appointment" },
      { property: "og:description", content: "Book a pickup slot for your packages. The front desk prepares them and records the handoff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

/* ── Content. Every line describes something the app does today. ── */

const steps: Step[] = [
  {
    n: "01",
    label: "At the desk",
    title: "The desk logs the delivery",
    body: "Staff register each package to a resident with its carrier, tracking number and storage location. It appears in your package list, and you can book it once the desk marks it available.",
    visual: <ArrivesVignette />,
  },
  {
    n: "02",
    label: "On your phone",
    title: "You book a pickup slot",
    body: "Pick a day and a time window that still has places left. If your plans change, move the pickup or cancel it.",
    visual: <SlotVignette />,
  },
  {
    n: "03",
    label: "At pickup",
    title: "Check in and collect",
    body: "Check in from your phone when you arrive. The desk confirms who you are, records who signed for the package and completes the pickup. The receipt stays in your history.",
    visual: <HandoffVignette />,
  },
];

const residentFeatures: Feature[] = [
  { icon: Package, title: "Your packages only", body: "Each package logged for you, with its carrier, tracking number and arrival time." },
  { icon: CalendarClock, title: "Book a pickup slot", body: "Choose a day and a time window. Each slot shows how many places are left." },
  { icon: RefreshCw, title: "Move or cancel", body: "Change the time or cancel the pickup yourself, without calling the desk." },
  { icon: UserCheck, title: "Check in on arrival", body: "Check in from your phone so the desk knows you are there." },
  { icon: Receipt, title: "Receipts in your history", body: "Every completed pickup is kept with the package details and the time it was handed over." },
  { icon: Smartphone, title: "Nothing to install", body: "Red-E Now runs in the browser on your phone or computer." },
];

const deskFeatures: Feature[] = [
  { icon: PackagePlus, title: "Register packages", body: "Log the carrier, tracking number, resident and storage location as deliveries come in." },
  { icon: ClipboardList, title: "Today's pickups", body: "Every booking for the day in one list, with who has checked in." },
  { icon: ListOrdered, title: "Preparation queue", body: "See which packages to pull next and where they are stored." },
  { icon: ClipboardCheck, title: "Verified handoff", body: "Confirm identity, record who signed for the package, then complete the pickup." },
  { icon: History, title: "Receipt and audit trail", body: "Each package keeps a record of what happened to it, when, and who did it." },
  { icon: CalendarDays, title: "Pickup hours and capacity", body: "Set when the desk takes pickups and how many bookings fit in a slot." },
];

/* ── Page ── */

const navLink = cn(quietLink, "px-3 py-2 text-sm");

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/75 backdrop-blur-xl">
      <a
        href="#main"
        className={cn("sr-only rounded-md bg-card px-3 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-40", focusRing)}
      >
        Skip to content
      </a>
      <nav aria-label="Main" className={cn(container, "flex h-16 items-center justify-between gap-3")}>
        <div className="flex items-center gap-6">
          <Wordmark />
          <div className="hidden items-center lg:flex">
            <a href="#how" data-testid="nav-how-link" className={navLink}>How it works</a>
            <a href="#residents" className={navLink}>Residents</a>
            <a href="#front-desk" className={navLink}>Front desk</a>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeTabs compact className="shrink-0" />
          <Link to="/staff/login" data-testid="nav-staff-portal-link" className={cn(navLink, "hidden whitespace-nowrap md:inline-block")}>Staff sign in</Link>
          <Link to="/login" data-testid="nav-signin-link" className={cn(navLink, "whitespace-nowrap")}>Sign in</Link>
          <ButtonLink to="/signup" variant="inverse" size="sm" className="hidden sm:inline-flex">Create account</ButtonLink>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section data-testid="hero-section" className={cn(container, "pt-16 sm:pt-24 lg:pt-28")}>
      {/* CSS entrance (not JS), so the headline is readable before hydration. */}
      <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700">
        <p className={cn(labelClass, "text-[13px]")}>Package pickup for apartment buildings</p>
        <h1 data-testid="hero-headline" className="mt-5 text-[42px] font-medium leading-[1.02] tracking-[-0.03em] sm:text-[56px] lg:text-[68px]">
          Package pickup,<br />by appointment.
        </h1>
        <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
          Residents book a pickup slot from their phone. The front desk sees every booking on one board, gets the
          packages ready and records a verified handoff.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-12 gap-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink to="/signup" size="lg" data-testid="hero-signup-link">
              Create an account <ArrowRight size={16} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink to="/login" variant="secondary" size="lg" data-testid="hero-signin-link">Sign in</ButtonLink>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="mr-3 font-medium text-foreground">Front desk</span>
            <Link to="/staff/login" data-testid="hero-staff-signin-link" className={cn(quietLink, "inline-flex items-center gap-1.5")}>
              Staff sign in <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">You need your building code to sign up. The front desk has it.</p>
      </div>
      <PickupBoardPreview
        fade
        className="animate-in fade-in fill-mode-both mt-14 delay-150 duration-1000 sm:mt-20"
      />
    </section>
  );
}

const STATEMENT_LEAD = "One schedule for the package room.";
const STATEMENT_BODY =
  "Every package is logged to a resident, every pickup has a time, and every handoff is checked and signed for.";

/** Remount TextAnimate on an interval so blur-in-by-word plays in a loop. */
function Statement() {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setCycle((n) => n + 1), 6500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className={cn(container, "py-24 sm:py-32")}>
      <Reveal>
        <p className={cn(sectionTitle, "max-w-[34ch]")}>
          <TextAnimate
            key={`lead-${cycle}`}
            as="span"
            by="word"
            animation="blurInUp"
            duration={0.4}
            startOnView={false}
            once={false}
            className="text-foreground"
          >
            {STATEMENT_LEAD}
          </TextAnimate>{" "}
          <TextAnimate
            key={`body-${cycle}`}
            as="span"
            by="word"
            animation="blurInUp"
            delay={0.35}
            duration={0.45}
            startOnView={false}
            once={false}
            className="text-muted-foreground"
          >
            {STATEMENT_BODY}
          </TextAnimate>
        </p>
      </Reveal>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" data-testid="how-section" className="scroll-mt-16 overflow-x-clip border-t border-border pt-24 sm:pt-32">
      <div className={container}>
        <SectionHeading label="How it works" title="From the front desk to your hands">
          <p>Three steps, and each one is recorded. Residents and staff see the same pickup from their own side.</p>
        </SectionHeading>
        <div className="mt-12 sm:mt-20">
          <StackingSteps steps={steps} />
        </div>
      </div>
    </section>
  );
}

function AudienceSection({ id, label, title, lead, cta, features }: {
  id: string; label: string; title: string; lead: string;
  cta: { to: "/signup" | "/staff/login"; label: string };
  features: Feature[];
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-border py-24 sm:py-32">
      <div className={container}>
        <SectionHeading label={label} title={title}>
          <p>{lead}</p>
          <Link to={cta.to} className={cn(focusRing, "mt-5 inline-flex items-center gap-1.5 rounded-sm text-[15px] font-medium text-foreground transition-colors hover:text-muted-foreground")}>
            {cta.label} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </SectionHeading>
        <FeatureGrid features={features} className="mt-12 sm:mt-16" />
      </div>
    </section>
  );
}

function ClosingCall() {
  return (
    <section className="border-t border-border py-24 sm:py-32">
      <Reveal className={cn(container, "flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between")}>
        <div>
          <h2 className={cn(sectionTitle, "max-w-[16ch]")}>Have your building code?</h2>
          <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">
            Create an account with your unit number and book your first pickup.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink to="/signup" size="lg">Create an account <ArrowRight size={16} aria-hidden="true" /></ButtonLink>
          <ButtonLink to="/login" variant="secondary" size="lg">Sign in</ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}

const footerLink = cn(quietLink, "inline-block py-1 text-sm");

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className={cn(container, "grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]")}>
        <div>
          <Wordmark />
          <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">Package pickup scheduling for apartment buildings.</p>
        </div>
        <nav aria-label="Residents">
          <p className={labelClass}>Residents</p>
          <ul className="mt-3">
            <li><Link to="/login" className={footerLink}>Sign in</Link></li>
            <li><Link to="/signup" className={footerLink}>Create an account</Link></li>
            <li><Link to="/forgot-password" className={footerLink}>Password help</Link></li>
          </ul>
        </nav>
        <nav aria-label="Front desk">
          <p className={labelClass}>Front desk</p>
          <ul className="mt-3">
            <li><Link to="/staff/login" className={footerLink}>Staff sign in</Link></li>
            <li><Link to="/staff/forgot-password" className={footerLink}>Staff password help</Link></li>
          </ul>
        </nav>
        <nav aria-label="On this page">
          <p className={labelClass}>On this page</p>
          <ul className="mt-3">
            <li><a href="#how" className={footerLink}>How it works</a></li>
            <li><a href="#residents" className={footerLink}>For residents</a></li>
            <li><a href="#front-desk" className={footerLink}>For the front desk</a></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className={cn(container, "flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between")}>
          <p className="text-[13px] text-muted-foreground">© {new Date().getFullYear()} Red-E Now</p>
          <ThemeTabs />
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="relative text-foreground">
      <Nav />
      <main id="main">
        <Hero />
        <Statement />
        <HowItWorks />
        <AudienceSection
          id="residents"
          label="For residents"
          title="Know what is waiting. Choose when to collect it."
          lead="Sign up with your building code and unit number. You see the packages logged for you and nobody else's."
          cta={{ to: "/signup", label: "Create an account" }}
          features={residentFeatures}
        />
        <AudienceSection
          id="front-desk"
          label="For the front desk"
          title="One board for the day. A record of every handoff."
          lead="The staff console shows what has arrived, who is coming, what to pull next and who signed for it."
          cta={{ to: "/staff/login", label: "Staff sign in" }}
          features={deskFeatures}
        />
        <ClosingCall />
      </main>
      <Footer />
    </div>
  );
}
