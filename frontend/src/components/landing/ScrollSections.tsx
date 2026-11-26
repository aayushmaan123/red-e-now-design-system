/**
 * Landing motion — scroll reveals and the "How it works" stacking cards.
 *
 * Reveals replay every time a block enters the viewport, scrolling down or up
 * (viewport once: false): fade, short rise, de-blur. prefers-reduced-motion is
 * handled by MotionConfig in __root.tsx, so nothing here branches its markup on it.
 */
import { Fragment, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── Reveal ── */

export const revealEase = [0.16, 1, 0.3, 1] as const;
const hidden = { opacity: 0, y: 16, filter: "blur(6px)" };
const shown = { opacity: 1, y: 0, filter: "blur(0px)" };

/**
 * Fades its children in when they scroll into view, and out again when they leave.
 * `amount` is the share of the block that must be visible; use a small value for tall blocks.
 */
export function Reveal({ children, className, delay = 0, amount = 0.3 }: {
  children: ReactNode; className?: string | undefined; delay?: number; amount?: number;
}) {
  return (
    <motion.div
      initial={hidden}
      whileInView={shown}
      viewport={{ once: false, amount }}
      transition={{ duration: 0.7, ease: revealEase, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── StackingSteps ──
 * Each card sticks below the nav; the next card slides up over it like a deck.
 * Covered cards ease back to a slightly smaller scale and dim a little.
 * Note: no ancestor may use overflow: hidden/auto, or position: sticky stops working
 * (use overflow-x-clip).
 */

export type Step = {
  n: string;
  label: string;
  title: string;
  body: string;
  /** Small example of the screen this step happens on. */
  visual: ReactNode;
};

const STACK_OFFSET = 14; // px: each card sits a little lower so the deck edges show

/**
 * Scroll progress of an element through the viewport: 0 when its top reaches the top of the
 * viewport, 1 when its bottom reaches the bottom.
 *
 * Measured by hand from window scroll instead of useScroll({ target }): that option warns
 * ("Please ensure that the container has a non-static position…") whenever the scroll container
 * is the document, because <html> is position: static.
 */
function useElementScrollProgress(ref: RefObject<HTMLElement | null>) {
  const { scrollY } = useScroll();
  const start = useMotionValue(0);
  const end = useMotionValue(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      start.set(top);
      end.set(top + rect.height - window.innerHeight);
    };
    measure();
    // The element's own size, and anything above it that changes the page height (fonts, wrapping).
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, start, end]);

  return useTransform([scrollY, start, end], ([y = 0, s = 0, e = 0]: number[]) =>
    e > s ? Math.min(1, Math.max(0, (y - s) / (e - s))) : 0,
  );
}

export function StackingSteps({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const progress = useElementScrollProgress(ref);

  return (
    <ol ref={ref} className="relative m-0 list-none p-0 [--stack-top:76px] sm:[--stack-top:104px]">
      {steps.map((step, i) => (
        <Fragment key={step.n}>
          <StackCard step={step} index={i} total={steps.length} progress={progress} />
          {/* Scroll distance before the next card arrives. Spacers, not margins:
              a sticky box's own margin counts against its container's edge. */}
          {i < steps.length - 1 && <li aria-hidden="true" className="h-[32vh]" />}
        </Fragment>
      ))}
      {/* Holds the full deck in place for a beat before the section scrolls on.
          A real element, not padding: sticky ignores the container's padding. */}
      <li aria-hidden="true" className="h-[30vh]" />
    </ol>
  );
}

function StackCard({ step, index, total, progress }: {
  step: Step; index: number; total: number; progress: MotionValue<number>;
}) {
  // Reduced motion keeps the stacking but drops the shrink. The style prop is always the
  // same shape, so server and client HTML match (no hydration warning).
  const reduce = useReducedMotion();
  const depth = total - 1 - index; // how many cards end up on top of this one
  const range = [index / total, 1];
  const scale = useTransform(progress, range, [1, reduce ? 1 : 1 - depth * 0.035]);
  const dim = useTransform(progress, range, [0, depth * 0.22]);

  return (
    <li className="sticky" style={{ top: `calc(var(--stack-top) + ${index * STACK_OFFSET}px)` }}>
      <motion.article
        style={{ scale, transformOrigin: "top center" }}
        className={cn(
          "relative grid min-h-[30rem] content-between gap-8 overflow-hidden rounded-xl border border-border bg-card p-6",
          "shadow-[0_-16px_40px_-20px_var(--shadow-tone)]",
          "sm:min-h-[22rem] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] sm:content-normal sm:items-center sm:gap-12 sm:p-10",
        )}
      >
        <div>
          <p className="flex items-center gap-3 text-[13px] text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground">{step.n}</span>
            <span aria-hidden="true" className="h-px w-6 bg-border-strong" />
            {step.label}
          </p>
          <h3 className="mt-5 text-[26px] font-medium leading-[1.1] tracking-[-0.022em] sm:text-[32px]">{step.title}</h3>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
        </div>
        {step.visual}
        {/* Dims the card as later cards land on it (opacity only). */}
        <motion.div aria-hidden="true" style={{ opacity: dim }} className="pointer-events-none absolute inset-0 bg-background" />
      </motion.article>
    </li>
  );
}
