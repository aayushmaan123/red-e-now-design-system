/**
 * Landing page — Bold Dark Ops hero + scroll-driven slide animations.
 *
 * Hero is preserved (cover page). "How it works" and audience sections
 * are rebuilt: no cards, content slides in from left/right with stagger
 * as the user scrolls (Igloo-inspired seamless reveal).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Wordmark, labelClass } from "@/components/common";
import { PickupBoardPreview } from "@/components/landing/PickupBoardPreview";
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

/* ── Animation variants ── */

const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};

const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};

const slideUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

/* Shared viewport trigger config */
const vp = { once: true, amount: 0.3 } as const;

/* ── Data ── */

const steps = [
  { n: "01", title: "It arrives", body: "The desk logs each delivery against your unit. You get a notification with the carrier and tracking number." },
  { n: "02", title: "You pick a slot", body: "Choose a 15-minute pickup window that suits you, today or later in the week." },
  { n: "03", title: "Walk in, walk out", body: "Your packages are pulled and waiting. Verify, sign on the desk screen, done." },
];

const audiences = [
  {
    eyebrow: "Residents",
    title: "No more digging through the package room",
    points: ["See every package waiting for your unit", "Book, move or cancel a pickup slot", "Track each pickup from prepped to handed off"],
    cta: { to: "/signup" as const, label: "Create an account" },
    direction: "left" as const,
  },
  {
    eyebrow: "Front desk",
    title: "One board for every pickup today",
    points: ["Register a package in a few keystrokes", "Prep queue ordered by pickup time", "Verified handoff with a digital receipt"],
    cta: { to: "/staff/login" as const, label: "Staff sign in" },
    direction: "right" as const,
  },
];

/* ── Button classes ── */

const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-[15px] font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const btnPrimary = cn(btn, "bg-primary text-primary-foreground shadow-bezel-sm hover:bg-primary-hover");
const btnSecondary = cn(btn, "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-accent");

/* ── Page ── */

function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className="hidden rounded-md px-3 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground sm:inline-block">How it works</a>
            <Link to="/login" className="rounded-md px-3 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
            <Link to="/staff/login" className={cn(btnSecondary, "h-9 px-3.5 text-sm")}>Staff portal</Link>
          </div>
        </nav>
      </header>

      {/* Hero — preserved */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <div aria-hidden="true" className="dot-field" />
        <div aria-hidden="true" className="hero-streaks"><i /><i /><i /><i /></div>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-24">
          <div>
            <p className={labelClass}>Package pickup for apartment buildings</p>
            <h1 className="mt-4 font-display text-[44px] font-medium uppercase leading-[0.95] tracking-[-0.02em] sm:text-6xl lg:text-[54px]">
              Every package,<br />on the board.
            </h1>
            <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted-foreground">
              Book a pickup slot from your phone. The desk sees it the moment it's booked, and your packages are ready when you walk in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className={btnPrimary}>Book a pickup <ArrowRight size={17} /></Link>
              <Link to="/staff/login" className={btnSecondary}>Staff sign in</Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              New to your building?{" "}
              <Link to="/signup" className="font-semibold text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-primary">
                Create an account
              </Link>
            </p>
          </div>
          <PickupBoardPreview />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS — scroll-driven slide animations
          Each step slides in from alternating directions
          ═══════════════════════════════════════════════════════ */}
      <section id="how" className="scroll-mt-20 overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Section header slides up */}
          <motion.div
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
          >
            <p className={labelClass}>How it works</p>
            <h2 className="mt-3 max-w-[22ch] font-display text-3xl font-medium uppercase leading-none tracking-[-0.01em] sm:text-4xl">
              From the loading dock to your hands
            </h2>
          </motion.div>

          {/* Steps — each slides in from alternating sides */}
          <div className="mt-16 space-y-20 sm:mt-20 sm:space-y-28">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                variants={i % 2 === 0 ? slideFromLeft : slideFromRight}
                initial="hidden"
                whileInView="visible"
                viewport={vp}
                className={cn(
                  "flex flex-col gap-4",
                  i % 2 === 0 ? "items-start" : "items-end text-right",
                  "md:max-w-[60%]",
                  i % 2 !== 0 && "md:ml-auto"
                )}
              >
                {/* Step number — large, faded */}
                <span className="font-mono text-6xl font-bold leading-none text-primary/20 sm:text-8xl">
                  {s.n}
                </span>
                <h3 className="font-display text-2xl font-medium uppercase tracking-[-0.01em] sm:text-3xl">
                  {s.title}
                </h3>
                <p className="max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                  {s.body}
                </p>
                {/* Thin accent line */}
                <motion.div
                  className="mt-2 h-px bg-gradient-to-r from-primary/40 to-transparent"
                  style={{ width: "120px" }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={vp}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          RESIDENTS vs FRONT DESK — slide in from sides
          No cards — just flowing content with a divider
          ═══════════════════════════════════════════════════════ */}
      <section className="overflow-hidden border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="grid gap-20 md:grid-cols-2 md:gap-16">
            {audiences.map((a) => (
              <motion.div
                key={a.eyebrow}
                variants={a.direction === "left" ? slideFromLeft : slideFromRight}
                initial="hidden"
                whileInView="visible"
                viewport={vp}
                className="flex flex-col"
              >
                <p className={labelClass}>{a.eyebrow}</p>
                <h2 className="mt-3 max-w-[20ch] font-display text-2xl font-medium uppercase leading-tight tracking-[-0.01em] sm:text-3xl">
                  {a.title}
                </h2>

                {/* Points — staggered fade-in */}
                <motion.ul
                  className="mt-8 space-y-4"
                  variants={staggerChildren}
                  initial="hidden"
                  whileInView="visible"
                  viewport={vp}
                >
                  {a.points.map((p) => (
                    <motion.li
                      key={p}
                      variants={fadeIn}
                      className="flex items-start gap-3 text-[15px]"
                    >
                      <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
                      <span>{p}</span>
                    </motion.li>
                  ))}
                </motion.ul>

                <Link
                  to={a.cta.to}
                  className="mt-8 inline-flex items-center gap-2 self-start rounded-sm text-[15px] font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  {a.cta.label} <ArrowRight size={16} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Wordmark />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link to="/login" className="transition-colors hover:text-foreground">Resident sign in</Link>
            <Link to="/signup" className="transition-colors hover:text-foreground">Create an account</Link>
            <Link to="/staff/login" className="transition-colors hover:text-foreground">Staff portal</Link>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            © {new Date().getFullYear()} Red-E Now
          </p>
        </div>
      </footer>
    </main>
  );
}
