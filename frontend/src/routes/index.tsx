/* Landing page — dark red floating particles background, ripple buttons. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeTabs, Wordmark, labelClass } from "@/components/common";
import { useTheme } from "@/hooks/useTheme";
import { PickupBoardPreview } from "@/components/landing/PickupBoardPreview";
import { AudienceBlock, StackingSteps, revealEase, revealViewport, type Audience, type Step } from "@/components/landing/ScrollSections";
import { ArrivesIcon, HandoffIcon, SlotIcon } from "@/components/landing/StepIcons";
import { Floating3DParticles } from "@/components/ui/floating-3d-particles";
import { RippleButton } from "@/components/ui/ripple-button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Red-E Now | Package Pickup, Reimagined" },
      { name: "description", content: "Book a pickup slot for your packages. The front desk has them ready before you walk in." },
      { property: "og:title", content: "Red-E Now | Package Pickup, Reimagined" },
      { property: "og:description", content: "Book a pickup slot. Your packages are ready when you arrive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

const steps: Step[] = [
  { n: "01", title: "It arrives", body: "The desk logs each delivery against your unit. It shows up on your home screen with the carrier and tracking number.", Icon: ArrivesIcon },
  { n: "02", title: "You pick a slot", body: "Choose a pickup window that suits you, today or later in the week. Move or cancel it if plans change.", Icon: SlotIcon },
  { n: "03", title: "Walk in, walk out", body: "Your packages are pulled and waiting. Check in, the desk verifies who you are and records the handoff, done.", Icon: HandoffIcon },
];

const audiences: Audience[] = [
  {
    eyebrow: "Residents",
    title: "No more digging through the package room",
    points: ["See every package waiting for your unit", "Book, move or cancel a pickup slot", "Track each pickup from prepped to handed off"],
    cta: { to: "/signup", label: "Create an account" },
    direction: "left",
  },
  {
    eyebrow: "Front desk",
    title: "One board for every pickup today",
    points: ["Register a package in a few keystrokes", "Prep queue ordered by pickup time", "Verified handoff with a receipt and audit trail"],
    cta: { to: "/staff/login", label: "Staff sign in" },
    direction: "right",
  },
];

const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-[15px] font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const btnPrimary = cn(btn, "bg-primary text-primary-foreground shadow-bezel-sm hover:bg-primary-hover");
const btnSecondary = cn(btn, "border border-border-strong text-foreground hover:bg-accent");

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-1 sm:gap-2">
          <a href="#how" data-testid="nav-how-link" className="hidden rounded-md px-3 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground sm:inline-block">How it works</a>
          <Link to="/login" data-testid="nav-signin-link" className="whitespace-nowrap rounded-md px-3 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
          <ThemeTabs compact className="shrink-0 sm:mx-1" />
          <Link to="/staff/login" data-testid="nav-staff-portal-link" className={cn(btnSecondary, "hidden h-9 whitespace-nowrap px-3.5 text-sm sm:inline-flex")}>Staff portal</Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <section data-testid="hero-section" className="relative isolate min-h-[90vh] overflow-hidden">
      <div aria-hidden="true" className="dot-field" />
      <div aria-hidden="true" className="hero-streaks"><i /><i /><i /><i /></div>
      <div className="mx-auto grid min-h-[90vh] max-w-6xl content-center items-center gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          <p className={labelClass}>Package pickup for apartment buildings</p>
          <h1 data-testid="hero-headline" className="mt-4 font-display text-[44px] font-medium leading-[0.95] tracking-[-0.022em] sm:text-6xl lg:text-[54px]">
            Every package,<br />on the board.
          </h1>
          <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted-foreground">
            Book a pickup slot from your phone. The desk sees it the moment it's booked, and your packages are ready when you walk in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <RippleButton rippleColor="#e40000" duration="700ms" className={btnPrimary} onClick={() => window.location.href = "/login"}>
              <span className="flex items-center gap-2" data-testid="hero-book-pickup-btn">Book a pickup <ArrowRight size={17} /></span>
            </RippleButton>
            <RippleButton rippleColor="currentColor" duration="700ms" className={btnSecondary} onClick={() => window.location.href = "/staff/login"}>
              <span data-testid="hero-staff-signin-btn">Staff sign in</span>
            </RippleButton>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            New to your building?{" "}
            <Link to="/signup" data-testid="hero-signup-link" className="font-semibold text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-primary">
              Create an account
            </Link>
          </p>
        </motion.div>
        <PickupBoardPreview />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" data-testid="how-section" className="grid-field overflow-x-clip py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={revealViewport}
          transition={{ duration: 0.7, ease: revealEase }}
        >
          <p className={labelClass}>How it works</p>
          <h2 className="mt-3 max-w-[22ch] font-display text-3xl font-medium leading-none tracking-[-0.01em] sm:text-4xl">
            From the loading dock to your hands
          </h2>
        </motion.div>
        <div className="mt-16 sm:mt-24">
          <StackingSteps steps={steps} />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex min-h-[40vh] items-end">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Wordmark />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link to="/login" className="transition-colors hover:text-foreground">Resident sign in</Link>
          <Link to="/signup" className="transition-colors hover:text-foreground">Create an account</Link>
          <Link to="/staff/login" className="transition-colors hover:text-foreground">Staff portal</Link>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">© {new Date().getFullYear()} Red-E Now</p>
      </div>
    </footer>
  );
}

const PARTICLES = {
  dark: { color: "#7f1d1d", opacity: 0.2 },
  light: { color: "#dc0000", opacity: 0.1 },
  red: { color: "#ff4040", opacity: 0.22 },
} as const;

function LandingPage() {
  const { theme } = useTheme();
  const particles = PARTICLES[theme];
  return (
    <div className="relative bg-background text-foreground">
      {/* Particle background — fixed to viewport, behind all content */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <Floating3DParticles
          key={theme}
          color={particles.color}
          quantity={300}
          size={3}
          opacity={particles.opacity}
          drift={0.3}
          depth={0.6}
        />
      </div>

      <div className="relative z-10">
        <Nav />
        <Hero />
        <div className="section-fade" />
        <HowItWorks />
        <div className="section-fade" />

        <section className="overflow-hidden py-24 sm:py-32">
          <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 sm:px-6 md:grid-cols-2 md:gap-16">
            {audiences.map(a => <AudienceBlock key={a.eyebrow} audience={a} />)}
          </div>
        </section>

        <div className="section-fade" />
        <Footer />
      </div>
    </div>
  );
}
