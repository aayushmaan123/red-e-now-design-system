/* Landing page: what Red-E Now does, and how the front desk runs the day. */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowUpRight, CalendarDays, ClipboardCheck, ClipboardList, History, ListOrdered, PackagePlus,
} from "lucide-react";
import { Wordmark, labelClass } from "@/components/common";
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

const deskFeatures: Feature[] = [
  { icon: PackagePlus, title: "Register packages", body: "Log the carrier, tracking number, resident and storage location as deliveries come in." },
  { icon: ClipboardList, title: "Today's pickups", body: "Every booking for the day in one list, with who has checked in." },
  { icon: ListOrdered, title: "Preparation queue", body: "See which packages to pull next and where they are stored." },
  { icon: ClipboardCheck, title: "Verified handoff", body: "Confirm identity, record who signed for the package, then complete the pickup." },
  { icon: History, title: "Receipt and audit trail", body: "Each package keeps a record of what happened to it, when, and who did it." },
  { icon: CalendarDays, title: "Pickup hours and capacity", body: "Set when the desk takes pickups and how many bookings fit in a slot." },
];

/* ── Page ── */

/** Pill nav link — soft until hover, then a white (foreground) highlight capsule. */
const pillLink = cn(
  "inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium text-foreground/75",
  "transition-[background-color,color,transform] duration-200 ease-out",
  "hover:bg-foreground hover:text-background hover:scale-[1.02]",
  "active:scale-[0.98]",
  focusRing,
);

function Nav() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-4 sm:px-4 sm:pt-5">
      <a
        href="#main"
        className={cn("sr-only rounded-md bg-card px-3 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-40", focusRing)}
      >
        Skip to content
      </a>
      <div className="relative mx-auto flex max-w-5xl items-center justify-center">
        <nav
          aria-label="Main"
          className={cn(
            "flex max-w-full items-center gap-0.5 rounded-full border border-border/80",
            "bg-background/45 px-1.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl",
            "supports-[backdrop-filter]:bg-background/35",
          )}
        >
          <Wordmark className="mr-1 rounded-full px-2.5 py-1.5 [&_span:last-child]:text-[15px]" />

          <a href="#how" data-testid="nav-how-link" className={cn(pillLink, "hidden lg:inline-flex")}>
            How it works
          </a>
          <a href="#front-desk" className={cn(pillLink, "hidden lg:inline-flex")}>
            Front desk
          </a>
          <Link
            to="/staff/login"
            data-testid="nav-staff-portal-link"
            className={cn(pillLink, "hidden whitespace-nowrap md:inline-flex")}
          >
            Staff sign in
          </Link>
          <Link
            to="/login"
            data-testid="nav-signin-link"
            className={cn(pillLink, "whitespace-nowrap")}
          >
            Sign in
          </Link>

          <ButtonLink
            to="/signup"
            variant="inverse"
            size="sm"
            className="ml-0.5 hidden rounded-full px-4 sm:inline-flex"
          >
            Create account
            <ArrowUpRight size={14} aria-hidden="true" />
          </ButtonLink>
        </nav>
      </div>
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
        <p className={cn(sectionTitle, "max-w-[34ch] font-semibold text-foreground")}>
          <TextAnimate
            key={`lead-${cycle}`}
            as="span"
            by="word"
            animation="blurInUp"
            duration={0.4}
            startOnView={false}
            once={false}
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
            <li><a href="#front-desk" className={footerLink}>For the front desk</a></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className={cn(container, "py-6")}>
          <p className="text-[13px] text-muted-foreground">© {new Date().getFullYear()} Red-E Now</p>
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
