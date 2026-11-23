/**
 * StaffBadges — small badge components for handoff stages and exceptions.
 */
import { AlertTriangle } from "lucide-react";
import { type HandoffStage, HANDOFF_TONES } from "./StaffTypes";

export function HandoffBadge({ stage }: { stage: HandoffStage }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${HANDOFF_TONES[stage]}`}>
      {stage}
    </span>
  );
}

export function ExceptionBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
      <AlertTriangle size={12} /> Exception
    </span>
  );
}
