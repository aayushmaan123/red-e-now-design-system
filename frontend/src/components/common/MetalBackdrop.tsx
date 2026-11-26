/**
 * Shared dark-red liquid-metal stage for every page.
 * One WebGL instance at the root — do not mount ShaderMetal again in routes.
 */
import { ShaderMetal } from "@/components/ui/shader-metal";
import { cn } from "@/lib/utils";

export const METAL_RED = "#9E1F1F";

export function MetalBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <ShaderMetal
        theme="auto"
        color={METAL_RED}
        ribbons={4}
        speed={0.28}
        iridescence={0.22}
        interactive
        className="opacity-[0.75]"
      />
      {/* Keep UI readable over the ribbons on every surface. */}
      <div className="absolute inset-0 bg-background/50 dark:bg-background/40" />
    </div>
  );
}
