/**
 * Error reporting stub for the Lovable platform.
 * In production this sends errors to Lovable's error tracking service.
 * For local development it logs to the console.
 */

export function reportLovableError(error: Error, context?: Record<string, unknown>) {
  console.error("[Red-E Now Error]", error.message, context);
}
