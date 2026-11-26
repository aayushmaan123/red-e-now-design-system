/**
 * SmoothCursor — physics-based custom cursor with spring animation.
 * API-compatible with @magicui/smooth-cursor.
 * Automatically hides on touch devices.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
  restDelta: number;
}

interface SmoothCursorProps {
  /** Custom cursor element. Defaults to a small red-accented dot. */
  cursor?: ReactNode;
  /** Spring physics config. */
  springConfig?: Partial<SpringConfig>;
}

const defaultSpring: SpringConfig = {
  damping: 45,
  stiffness: 400,
  mass: 1,
  restDelta: 0.001,
};

function DefaultCursor() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="4" fill="var(--primary, #e40000)" />
      <circle cx="10" cy="10" r="8" stroke="var(--primary, #e40000)" strokeWidth="1" strokeOpacity="0.4" fill="none" />
    </svg>
  );
}

export function SmoothCursor({ cursor, springConfig }: SmoothCursorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rotRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const spring = { ...defaultSpring, ...springConfig };

  useEffect(() => {
    // Skip on touch-only devices
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;

    function onMove(e: MouseEvent) {
      targetRef.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    }

    function onLeave() {
      setVisible(false);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    function tick(time: number) {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.064); // cap at ~16fps min
      lastTimeRef.current = time;

      const pos = posRef.current;
      const vel = velRef.current;
      const target = targetRef.current;

      // Spring force: F = -k*(x - target) - d*v
      const forceX = -spring.stiffness * (pos.x - target.x) - spring.damping * vel.x;
      const forceY = -spring.stiffness * (pos.y - target.y) - spring.damping * vel.y;

      // Acceleration
      vel.x += (forceX / spring.mass) * dt;
      vel.y += (forceY / spring.mass) * dt;

      // Position
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      // Rotation from velocity direction
      const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2);
      if (speed > 2) {
        const targetRot = Math.atan2(vel.y, vel.x) * (180 / Math.PI);
        rotRef.current += (targetRot - rotRef.current) * 0.15;
      }

      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) rotate(${rotRef.current}deg)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [visible, spring.damping, spring.stiffness, spring.mass]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      style={{ willChange: "transform" }}
    >
      {cursor ?? <DefaultCursor />}
    </div>
  );
}
