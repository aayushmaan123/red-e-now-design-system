/**
 * Landing sections — "How it works" stacking cards + AudienceBlock.
 * Reveals replay every time a block enters the viewport, scrolling down or up
 * (viewport once: false). Linear-style: fade, short rise, de-blur.
 * Respects prefers-reduced-motion via MotionConfig in __root.tsx.
 */
import { Fragment, useRef, type ComponentType } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { labelClass } from "@/components/common";

/* ── Types ── */

export type Step = {
  n: string;
  title: string;
  body: string;
  Icon: ComponentType<{ className?: string }>;
};

export type Audience = {
  eyebrow: string;
  title: string;
  points: string[];
  cta: { to: string; label: string };
  direction: "left" | "right";
};

/* ── Shared viewport config ── */
export const revealViewport = { once: false, amount: 0.3 } as const;
const viewport = revealViewport;
export const revealEase = [0.16, 1, 0.3, 1] as const;
const ease = revealEase;
const hidden = { opacity: 0, y: 20, filter: "blur(8px)" };
const shown = { opacity: 1, y: 0, x: 0, filter: "blur(0px)" };

/* ── StackingSteps ──
 * Each card sticks below the nav; the next card slides up over it like a deck.
 * Cards that are covered ease back to a slightly smaller scale.
 * Note: no ancestor may use overflow: hidden/auto, or position: sticky stops working.
 */

const STACK_TOP = 104; // px below the viewport top (nav is 64px)
const STACK_OFFSET = 16; // each card sits a little lower so the deck edges show

export function StackingSteps({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <div ref={ref} className="relative">
      {steps.map((step, i) => (
        <Fragment key={step.n}>
          <StackCard step={step} index={i} total={steps.length} progress={scrollYProgress} />
          {/* Scroll distance before the next card arrives. Spacers, not margins:
              a sticky box's own margin counts against its container's edge. */}
          {i < steps.length - 1 && <div aria-hidden="true" className="h-[45vh]" />}
        </Fragment>
      ))}
      {/* Holds the full deck in place for a beat before the section scrolls on.
          A real element, not padding: sticky ignores the container's padding. */}
      <div aria-hidden="true" className="h-[35vh]" />
    </div>
  );
}

function StackCard({ step, index, total, progress }: {
  step: Step; index: number; total: number; progress: MotionValue<number>;
}) {
  // Reduced motion keeps the stacking but drops the shrink. The style prop is
  // always the same shape so server and client HTML match (no hydration warning).
  const reduce = useReducedMotion();
  const targetScale = reduce ? 1 : 1 - (total - 1 - index) * 0.04;
  const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

  return (
    <div
      className="sticky"
      style={{ top: STACK_TOP + index * STACK_OFFSET }}
    >
      <motion.article
        style={{ scale, transformOrigin: "top center" }}
        className="grid min-h-[260px] gap-8 rounded-xl border border-border bg-card p-8 shadow-[0_-12px_32px_-16px_var(--shadow-tone)] sm:grid-cols-[140px_1fr] sm:gap-12 sm:p-10"
      >
        <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3">
          <span className="font-mono text-[13px] text-muted-foreground">{step.n}</span>
          <step.Icon className="size-10 text-primary" />
        </div>
        <div className="self-center">
          <h3 className="font-display text-2xl font-medium tracking-[-0.015em] sm:text-3xl">{step.title}</h3>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
        </div>
      </motion.article>
    </div>
  );
}

/* ── ScrollStep (whileInView) — single-step reveal, kept for reuse ── */

export function ScrollStep({ step }: { step: Step }) {
  return (
    <motion.div
      initial={hidden}
      whileInView={shown}
      viewport={viewport}
      transition={{ duration: 0.7, ease }}
      className="grid items-start gap-8 sm:grid-cols-[140px_1fr] sm:gap-12"
    >
      <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3">
        <span className="font-mono text-[13px] text-muted-foreground">{step.n}</span>
        <step.Icon className="size-10 text-primary" />
      </div>
      <div>
        <h3 className="font-display text-xl font-medium tracking-[-0.01em] sm:text-2xl">{step.title}</h3>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
      </div>
    </motion.div>
  );
}

/* ── AudienceBlock ── */

export function AudienceBlock({ audience }: { audience: Audience }) {
  const startX = audience.direction === "left" ? -40 : 40;

  return (
    <motion.div
      initial={{ ...hidden, y: 0, x: startX }}
      whileInView={shown}
      viewport={viewport}
      transition={{ duration: 0.7, ease }}
    >
      <p className={labelClass}>{audience.eyebrow}</p>
      <h3 className="mt-3 max-w-[20ch] font-display text-2xl font-medium leading-none tracking-[-0.01em] sm:text-3xl">
        {audience.title}
      </h3>
      <ul className="mt-6 space-y-3">
        {audience.points.map((pt) => (
          <li key={pt} className="flex items-start gap-3 text-[15px] text-muted-foreground">
            <Check size={16} className="mt-0.5 shrink-0 text-primary" />
            {pt}
          </li>
        ))}
      </ul>
      <Link
        to={audience.cta.to}
        className="mt-6 inline-flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.015em] text-foreground transition-colors hover:text-primary"
      >
        {audience.cta.label}
        <ArrowRight size={16} />
      </Link>
    </motion.div>
  );
}
