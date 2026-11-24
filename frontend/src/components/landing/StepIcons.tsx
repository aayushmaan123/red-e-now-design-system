/**
 * Inline SVG icons for the "How it works" steps on the landing page.
 * Hand-drawn style — no Lucide, no generic stock shapes.
 * Each icon tells the step's story at 40×40 default size.
 */

/** Step 01 — "It arrives": a package with a downward arrow. */
export function ArrivesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Package box */}
      <rect
        x="6"
        y="14"
        width="20"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Package center line */}
      <line x1="16" y1="14" x2="16" y2="32" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      {/* Lid flaps */}
      <path
        d="M6 14l4-6h12l4 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arrow coming down */}
      <path
        d="M32 4v14m0 0l-4-4m4 4l4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Step 02 — "You pick a slot": a clock face with a highlighted quarter. */
export function SlotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Clock circle */}
      <circle
        cx="20"
        cy="20"
        r="14"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {/* Highlighted slot wedge (15 min quarter) */}
      <path
        d="M20 20V8A12 12 0 0 1 32 20z"
        fill="currentColor"
        opacity="0.15"
      />
      {/* Hour hand */}
      <line
        x1="20"
        y1="20"
        x2="20"
        y2="11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="20"
        y1="20"
        x2="29"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="20" cy="20" r="1.5" fill="currentColor" />
      {/* Hour ticks */}
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="20"
          y1="7.5"
          x2="20"
          y2="9.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          transform={`rotate(${deg} 20 20)`}
        />
      ))}
    </svg>
  );
}

/** Step 03 — "Walk in, walk out": a hand receiving a package (handoff). */
export function HandoffIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Small package */}
      <rect
        x="12"
        y="4"
        width="16"
        height="14"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <line x1="20" y1="4" x2="20" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      {/* Lid */}
      <path
        d="M12 10l3-4h10l3 4"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.5"
        fill="none"
      />
      {/* Open hand below */}
      <path
        d="M10 28c0-3 2-5 4-6l6-2 6 2c2 1 4 3 4 6v2c0 1.5-1 3-3 3H13c-2 0-3-1.5-3-3v-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Checkmark overlay */}
      <path
        d="M16 28l3 3 5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
