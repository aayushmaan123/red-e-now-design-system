/**
 * Scroll-reveal landing sections — ScrollStep + AudienceBlock.
 * Each element slides in when it enters the viewport (whileInView).
 * This gives the same scroll-driven feel as useScroll+useTransform
 * but fires reliably across all browsers and contexts.
 * Respects prefers-reduced-motion via MotionConfig in __root.tsx.
 */
import { type ComponentType } from "react";
import { motion } from "framer-motion";
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
const viewport = { once: true, amount: 0.25 } as const;
const ease = [0.23, 1, 0.32, 1] as const;

/* ── ScrollStep ── */

/**
 * One "How it works" step. The step number + icon slide in from the left,
 * the text block slides in from the right, staggered slightly.
 */
export function ScrollStep({ step, index }: { step: Step; index: number }) {
  return (
    <div className="grid items-start gap-8 sm:grid-cols-[140px_1fr] sm:gap-12">
      {/* Step number + icon */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={viewport}
        transition={{ duration: 0.7, ease, delay: index * 0.05 }}
        className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3"
      >
        <span className="font-mono text-[13px] text-muted-foreground">{step.n}</span>
        <step.Icon className="size-10 text-primary" />
      </motion.div>

      {/* Title + body */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={viewport}
        transition={{ duration: 0.7, ease, delay: 0.1 + index * 0.05 }}
      >
        <h3 className="font-display text-xl font-medium uppercase tracking-[-0.01em] sm:text-2xl">
          {step.title}
        </h3>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>
      </motion.div>
    </div>
  );
}

/* ── AudienceBlock ── */

/**
 * Residents / Front desk audience section. Slides in from the direction
 * specified (left or right) when it enters the viewport.
 */
export function AudienceBlock({ audience }: { audience: Audience }) {
  const startX = audience.direction === "left" ? -40 : 40;

  return (
    <motion.div
      initial={{ opacity: 0, x: startX }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={viewport}
      transition={{ duration: 0.7, ease }}
    >
      <p className={labelClass}>{audience.eyebrow}</p>
      <h3 className="mt-3 max-w-[20ch] font-display text-2xl font-medium uppercase leading-none tracking-[-0.01em] sm:text-3xl">
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
        className="mt-6 inline-flex items-center gap-2 font-display text-[15px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:text-primary"
      >
        {audience.cta.label}
        <ArrowRight size={16} />
      </Link>
    </motion.div>
  );
}
