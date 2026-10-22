/**
 * Utility functions shared across the Red-E Now app.
 * cn() merges Tailwind CSS classes with conflict resolution.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes — handles conditional classes and resolves conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
