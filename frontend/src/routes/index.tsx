/* Landing page — hero with parallax board, scroll-linked "How it works" and audience sections. */
import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Wordmark, labelClass } from "@/components/common";
import { PickupBoardPreview } from "@/components/landing/PickupBoardPreview";
import { AudienceBlock, ScrollStep, type Audience, type Step } from "@/components/landing/ScrollSections";
import { ArrivesIcon, HandoffIcon, SlotIcon } from "@/components/landing/StepIcons";
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
  { n: "01", title: "It arrives", body: "The desk logs each delivery against your unit. You get a notification with the carrier and tracking number.", Icon: ArrivesIcon },
  { n: "02", title: "You pick a slot", body: "Choose a 15-minute pickup window that suits you, today or later in the week.", Icon: SlotIcon },
  { n: "03", title: "Walk in, walk out", body: "Your packages are pulled and waiting. Verify, sign on the desk screen, done.", Icon: HandoffIcon },
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
    points: ["Register a package in a few keystrokes", "Prep queue ordered by pickup time", "Verified handoff with a digital receipt"],
    cta: { to: "/staff/login", label: "Staff sign in" },
    direction: "right",
  },
];

const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-[15px] font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const btnPrimary = cn(btn, "bg-primary text-primary-foreground shadow-bezel-sm hover:bg-primary-hover");
const btnSecondary = cn(btn, "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-accent");

function Nav() {
  return <header className="sticky top-0 z-30 border-b border-border bg-background">
    <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <Wordmark />
      <div className="flex items-center gap-1 sm:gap-2">
        <a href="#how" data-testid="nav-how-link" className="hidden rounded-md px-3 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground sm:inline-block">How it works</a>
        <Link to="/login" data-testid="nav-signin-link" className="rounded-md px-3 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
        <Link to="/staff/login" data-testid="nav-staff-portal-link" className={cn(btnSecondary, "h-9 px-3.5 text-sm")}>Staff portal</Link>
      </div>
    </nav>
  </header>;
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const { scrollY } = useScroll();
  // Headline moves at 0.85x scroll speed: offset by +0.15 of the scrolled distance.
  const headlineY = useTransform(scrollY, v => v * 0.15);
  const heroOpacity = useTransform(scrollYProgress, [0.6, 1], [1, 0]);

  return <section ref={ref} data-testid="hero-section" className="relative isolate overflow-hidden">
    <div aria-hidden="true" className="dot-field" />
    <div aria-hidden="true" className="hero-streaks"><i /><i /><i /><i /></div>
    <motion.div style={reduce ? {} : { opacity: heroOpacity }} className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-28">
      <motion.div style={reduce ? {} : { y: headlineY }}>
        <p className={labelClass}>Package pickup for apartment buildings</p>
        <h1 data-testid="hero-headline" className="mt-4 font-display text-[44px] font-medium uppercase leading-[0.95] tracking-[-0.02em] sm:text-6xl lg:text-[54px]">
          Every package,<br />on the board.
        </h1>
        <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted-foreground">
          Book a pickup slot from your phone. The desk sees it the moment it's booked, and your packages are ready when you walk in.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/login" data-testid="hero-book-pickup-btn" className={btnPrimary}>Book a pickup <ArrowRight size={17} /></Link>
          <Link to="/staff/login" data-testid="hero-staff-signin-btn" className={btnSecondary}>Staff sign in</Link>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          New to your building?{" "}
          <Link to="/signup" data-testid="hero-signup-link" className="font-semibold text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-primary">
            Create an account
          </Link>
        </p>
      </motion.div>
      <PickupBoardPreview />
    </motion.div>
  </section>;
}

function Footer() {
  return <footer>
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <Wordmark />
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <Link to="/login" className="transition-colors hover:text-foreground">Resident sign in</Link>
        <Link to="/signup" className="transition-colors hover:text-foreground">Create an account</Link>
        <Link to="/staff/login" className="transition-colors hover:text-foreground">Staff portal</Link>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">© {new Date().getFullYear()} Red-E Now</p>
    </div>
  </footer>;
}

function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <div className="section-fade" />

      <section id="how" data-testid="how-section" className="grid-field scroll-mt-20 overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className={labelClass}>How it works</p>
          <h2 className="mt-3 max-w-[22ch] font-display text-3xl font-medium uppercase leading-none tracking-[-0.01em] sm:text-4xl">
            From the loading dock to your hands
          </h2>
          <div className="mt-16 space-y-24 sm:mt-24 sm:space-y-36">
            {steps.map((s, i) => <ScrollStep key={s.n} step={s} index={i} />)}
          </div>
        </div>
      </section>

      <div className="section-fade" />
      <section className="overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-20 px-4 py-24 sm:px-6 sm:py-32 md:grid-cols-2 md:gap-16">
          {audiences.map(a => <AudienceBlock key={a.eyebrow} audience={a} />)}
        </div>
      </section>

      <div className="section-fade" />
      <Footer />
    </main>
  );
}
