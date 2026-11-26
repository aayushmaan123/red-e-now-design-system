/**
 * Landing building blocks: the page container, section headings, the hairline
 * feature grid and the plain-answers list. Content lives in routes/index.tsx.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { labelClass } from "@/components/common";
import { cn } from "@/lib/utils";
import { Reveal } from "./ScrollSections";

/** Page container: one width and one gutter for every landing section. */
export const container = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";

/** Section title scale (one step below the hero headline). */
export const sectionTitle = "text-balance text-[32px] font-medium leading-[1.06] tracking-[-0.022em] sm:text-[44px] lg:text-5xl";

/** Small sentence-case label + large title on the left, supporting copy and a link on the right. */
export function SectionHeading({ label, title, children, className }: {
  label: string; title: ReactNode; children?: ReactNode; className?: string;
}) {
  return (
    <Reveal className={cn("grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-20", className)}>
      <div>
        <p className={cn(labelClass, "text-[13px]")}>{label}</p>
        <h2 className={cn(sectionTitle, "mt-4 max-w-[18ch]")}>{title}</h2>
      </div>
      {children && <div className="max-w-[48ch] text-[17px] leading-relaxed text-muted-foreground lg:pb-1.5">{children}</div>}
    </Reveal>
  );
}

export type Feature = { icon: LucideIcon; title: string; body: string };

/** Feature cells separated by hairlines (the 1px gaps show the border colour underneath). */
export function FeatureGrid({ features, className }: { features: Feature[]; className?: string }) {
  return (
    <Reveal amount={0.15} className={className}>
      <ul className="m-0 grid list-none gap-px overflow-hidden rounded-xl border border-border bg-border p-0 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <li key={f.title} className="bg-background p-6 sm:p-8">
            <f.icon size={18} strokeWidth={1.6} aria-hidden="true" className="text-muted-foreground" />
            <h3 className="mt-5 text-[15px] font-medium tracking-[-0.01em] text-foreground">{f.title}</h3>
            <p className="mt-1.5 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export type Fact = { question: string; answer: string };

/** Question and answer rows divided by hairlines. */
export function FactList({ facts, className }: { facts: Fact[]; className?: string }) {
  return (
    <Reveal amount={0.15} className={className}>
      <dl className="m-0 border-t border-border">
        {facts.map((f) => (
          <div key={f.question} className="grid gap-2 border-b border-border py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-16 md:py-7">
            <dt className="text-[17px] font-medium tracking-[-0.015em] text-foreground">{f.question}</dt>
            <dd className="m-0 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">{f.answer}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}
