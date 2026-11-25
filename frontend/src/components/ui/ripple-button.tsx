/**
 * RippleButton — button with expanding ripple ring on click.
 * API-compatible with @magicui/ripple-button.
 */
import { useState, useCallback, type MouseEvent, type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Colour of the ripple ring. */
  rippleColor?: string;
  /** Duration of one ripple animation. */
  duration?: string;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

let rippleId = 0;

export function RippleButton({
  children,
  className,
  rippleColor = "#ffffff",
  duration = "600ms",
  onClick,
  ...props
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = ++rippleId;

      setRipples(prev => [...prev, { x, y, id }]);

      const ms = parseInt(duration, 10) || 600;
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, ms);

      onClick?.(e);
    },
    [duration, onClick],
  );

  return (
    <button
      className={cn("relative overflow-hidden", className)}
      onClick={handleClick}
      {...props}
    >
      {children}
      {ripples.map(r => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: r.x,
            top: r.y,
            width: 0,
            height: 0,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${rippleColor}40 0%, transparent 70%)`,
            animation: `ripple-expand ${duration} ease-out forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes ripple-expand {
          to {
            width: 400px;
            height: 400px;
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
}
