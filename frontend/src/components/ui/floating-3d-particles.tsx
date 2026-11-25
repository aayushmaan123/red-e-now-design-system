/**
 * Floating3DParticles — pseudo-3D particle canvas background.
 * API-compatible with @magicui/floating-3d-particles.
 * Place inside a relative container; renders behind content (pointer-events-none).
 */
import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Floating3DParticlesProps {
  className?: string;
  /** Number of particles (desktop). Scales to 20% on mobile < 768px. */
  quantity?: number;
  /** Hex colour for every particle. */
  color?: string;
  /** Mean radius in px. Each particle varies ±40%. */
  size?: number;
  /** Mean opacity 0-1. Each particle varies ±0.2. */
  opacity?: number;
  /** Vertical drift speed in px/frame. Positive = upward. */
  drift?: number;
  /** 3D depth 0-1. 0 = flat, 1 = strong perspective. */
  depth?: number;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

interface Particle {
  x: number;
  y: number;
  z: number;
  radius: number;
  baseOpacity: number;
  driftX: number;
  driftY: number;
  driftZ: number;
  phase: number;      // oscillation phase offset
  phaseSpeed: number;  // how fast it oscillates
}

export function Floating3DParticles({
  className,
  quantity = 400,
  color = "#8B5CF6",
  size = 5,
  opacity = 0.3,
  drift = 0.8,
  depth = 0.5,
}: Floating3DParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const rgb = hexToRgb(color);

  const createParticles = useCallback((w: number, h: number) => {
    const isMobile = w < 768;
    const count = isMobile ? Math.max(Math.floor(quantity * 0.2), 20) : quantity;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const radiusVariance = size * (0.6 + Math.random() * 0.8); // ±40%
      const opacityVariance = Math.max(0, Math.min(1, opacity + (Math.random() - 0.5) * 0.4)); // ±0.2

      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),                          // 0 = far, 1 = near
        radius: radiusVariance,
        baseOpacity: opacityVariance,
        driftX: (Math.random() - 0.5) * drift * 0.3,
        driftY: -drift * (0.3 + Math.random() * 0.7), // upward
        driftZ: (Math.random() - 0.5) * 0.002,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.005 + Math.random() * 0.01,
      });
    }
    return particles;
  }, [quantity, size, opacity, drift]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    function resize() {
      const rect = canvas!.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = createParticles(w, h);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const particles = particlesRef.current;

      for (const p of particles) {
        // Update position
        p.phase += p.phaseSpeed;
        p.x += p.driftX + Math.sin(p.phase) * 0.15;
        p.y += p.driftY;
        p.z += p.driftZ;

        // Wrap around edges
        if (p.y < -p.radius * 2) p.y = h + p.radius * 2;
        if (p.y > h + p.radius * 2) p.y = -p.radius * 2;
        if (p.x < -p.radius * 2) p.x = w + p.radius * 2;
        if (p.x > w + p.radius * 2) p.x = -p.radius * 2;
        if (p.z < 0) p.z = 1;
        if (p.z > 1) p.z = 0;

        // Pseudo-3D: scale radius and opacity by z-depth
        const depthScale = depth > 0 ? 0.3 + p.z * 0.7 * depth + (1 - depth) * 0.7 : 1;
        const drawRadius = p.radius * depthScale;
        const drawOpacity = p.baseOpacity * depthScale;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, drawRadius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${drawOpacity})`;
        ctx!.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [createParticles, depth, rgb.r, rgb.g, rgb.b]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none", className)}
    />
  );
}
