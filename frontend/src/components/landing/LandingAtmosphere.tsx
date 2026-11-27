/**
 * LandingAtmosphere — premium black-and-crimson stage for the marketing page.
 *
 * Isolated from MetalBackdrop so staff and the resident app stay unchanged.
 * anime.js drives glow drift, route-curve shimmer and particles along SVG paths.
 * A clear static composition shows when prefers-reduced-motion is set.
 * All animation instances revert on unmount.
 */
import { useEffect, useRef } from "react";
import { animate, createMotionPath, createScope, stagger } from "animejs";
import { cn } from "@/lib/utils";

const CRIMSON = "#E53935";
const CRIMSON_DEEP = "#9E1F1F";
const GLOW_A = "rgba(229, 57, 53, 0.55)";
const GLOW_B = "rgba(158, 31, 31, 0.5)";

const ROUTES = [
  "M -40 180 C 180 40, 420 320, 700 140 S 1100 60, 1280 220",
  "M -20 420 C 220 520, 480 280, 760 460 S 1080 540, 1300 380",
  "M 80 -20 C 240 160, 360 80, 520 240 S 860 120, 1180 280",
] as const;

const PARTICLE_COUNT = 10;

function placeOnPath(particle: SVGCircleElement, path: SVGPathElement, t: number) {
  const length = path.getTotalLength();
  const point = path.getPointAtLength(length * Math.min(Math.max(t, 0.04), 0.96));
  particle.setAttribute("cx", String(point.x));
  particle.setAttribute("cy", String(point.y));
  particle.setAttribute("opacity", "0.9");
}

export function LandingAtmosphere({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = [...root.querySelectorAll<SVGCircleElement>("[data-particle]")];

    particles.forEach((particle, index) => {
      const path = root.querySelector<SVGPathElement>(`[data-route="${index % ROUTES.length}"]`);
      if (!path) return;
      placeOnPath(particle, path, ((index * 0.13) + (index % ROUTES.length) * 0.09) % 1);
    });

    if (reduce) return;

    const scope = createScope({ root });

    scope.add(() => {
      try {
        animate(root.querySelectorAll<HTMLElement>("[data-glow]"), {
          translateX: ["-7vw", "8vw"],
          translateY: ["6vh", "-7vh"],
          opacity: [0.55, 0.95],
          duration: 12000,
          ease: "inOutSine",
          loop: true,
          alternate: true,
          delay: stagger(1400),
        });

        animate(root.querySelectorAll<SVGPathElement>("[data-route]"), {
          opacity: [0.28, 0.55],
          duration: 4000,
          ease: "inOutSine",
          loop: true,
          alternate: true,
          delay: stagger(500),
        });

        particles.forEach((particle, index) => {
          const path = root.querySelector<SVGPathElement>(`[data-route="${index % ROUTES.length}"]`);
          if (!path) return;

          particle.setAttribute("cx", "0");
          particle.setAttribute("cy", "0");
          particle.setAttribute("opacity", "0");

          const motion = createMotionPath(path);
          const duration = 12000 + (index % 4) * 2400;
          const delay = index * 550;

          animate(particle, {
            ...motion,
            rotate: 0,
            duration,
            delay,
            loop: true,
            ease: "linear",
          });

          animate(particle, {
            opacity: [0, 1, 1, 0],
            duration,
            delay,
            loop: true,
            ease: "linear",
          });

          if (index % 2 === 0) {
            animate(particle, {
              r: [3.2, 5.2, 3.2],
              duration: 2200,
              delay: 1800 + index * 700,
              loop: true,
              ease: "inOutSine",
            });
          }
        });
      } catch (err) {
        console.error("LandingAtmosphere animation failed", err);
      }
    });

    return () => {
      scope.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-landing-atmosphere=""
      aria-hidden="true"
      className={cn(
        // z-0 (not -z-10): stays above the body fill so the stage is never buried.
        "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050506]",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, #000 10%, transparent 75%)",
        }}
      />

      <div
        data-glow="0"
        className="absolute -left-[8%] top-[-5%] h-[min(70vw,560px)] w-[min(70vw,560px)] min-h-[280px] min-w-[280px] rounded-full opacity-80 blur-[70px]"
        style={{ background: `radial-gradient(circle, ${GLOW_A} 0%, transparent 68%)` }}
      />
      <div
        data-glow="1"
        className="absolute -right-[4%] top-[22%] h-[min(58vw,460px)] w-[min(58vw,460px)] min-h-[240px] min-w-[240px] rounded-full opacity-70 blur-[80px]"
        style={{ background: `radial-gradient(circle, ${GLOW_B} 0%, transparent 70%)` }}
      />
      <div
        data-glow="2"
        className="absolute bottom-[-12%] left-[18%] h-[min(75vw,620px)] w-[min(75vw,620px)] min-h-[300px] min-w-[300px] rounded-full opacity-65 blur-[90px]"
        style={{ background: `radial-gradient(circle, ${GLOW_A} 0%, transparent 66%)` }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 640"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <filter id="particle-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft underlay strokes for depth */}
        {ROUTES.map((d) => (
          <path
            key={`soft-${d}`}
            d={d}
            stroke={CRIMSON_DEEP}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.14"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {ROUTES.map((d, i) => (
          <path
            key={d}
            data-route={i}
            d={d}
            stroke={CRIMSON}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.4"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
          <circle
            key={i}
            data-particle={i}
            r="3.5"
            fill={CRIMSON}
            opacity="0"
            filter="url(#particle-glow)"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        ))}
      </svg>

      <div className="absolute inset-0 bg-background/10 dark:bg-background/10" />
    </div>
  );
}
