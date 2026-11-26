/**
 * HandoffActions — the next step for one pickup, in the fixed order:
 * verify identity → sign-off (recipient name + acknowledgement) → confirm → complete.
 * Shows a short reason instead of a button when the desk has to wait.
 */
import { CheckCheck, CircleAlert, Clock3, PackageCheck, PenLine, ShieldCheck } from "lucide-react";
import { Button, TextInput } from "@/components/common";
import type { PickupAppointment } from "@/api/appointmentsApi";
import { useStaff } from "./StaffContext";
import { handoffStage } from "./StaffTypes";
import { Hint, TextAreaField } from "./ui";

export function HandoffActions({ appointment }: { appointment: PickupAppointment }) {
  const {
    section, choose, hasException, handoffBusyId,
    handleVerifyIdentity, openSignoff, handleSignoff, setHandoffTarget,
    signoffId, setSignoffId, signoffName, setSignoffName,
    signoffAck, setSignoffAck, signoffNote, setSignoffNote,
  } = useStaff();

  const stage = handoffStage(appointment);
  const busy = handoffBusyId === appointment.id;

  if (stage === "Completed") return null;

  if (hasException(appointment)) {
    return (
      <p className="flex items-center gap-2 text-sm text-foreground">
        <CircleAlert size={15} aria-hidden="true" className="shrink-0 text-primary" />
        <span>Resolve the package exception before continuing the handoff.</span>
      </p>
    );
  }

  if (appointment.package_status !== "prepared") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Hint icon={PackageCheck}>Prepare the package before handoff.</Hint>
        {section !== "Preparation Queue" && (
          <Button variant="secondary" size="sm" onClick={() => choose("Preparation Queue")}>
            Open preparation queue
          </Button>
        )}
      </div>
    );
  }

  if (stage === "Not checked in") {
    return <Hint icon={Clock3}>Waiting for the resident to check in when they arrive.</Hint>;
  }

  if (stage === "Waiting") {
    return (
      <Button onClick={() => handleVerifyIdentity(appointment)} disabled={busy} aria-busy={busy}>
        <ShieldCheck size={16} aria-hidden="true" /> {busy ? "Verifying…" : "Verify identity"}
      </Button>
    );
  }

  if (stage === "Identity verified") {
    if (signoffId !== appointment.id) {
      return (
        <Button onClick={() => openSignoff(appointment)}>
          <PenLine size={16} aria-hidden="true" /> Sign off
        </Button>
      );
    }
    return (
      <form onSubmit={(e) => handleSignoff(e, appointment)} className="space-y-4">
        <TextInput
          label="Recipient name"
          value={signoffName}
          onChange={(e) => setSignoffName(e.target.value)}
          maxLength={150}
          autoComplete="off"
          required
        />
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={signoffAck}
            onChange={(e) => setSignoffAck(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <span>The recipient acknowledges receiving this package.</span>
        </label>
        <TextAreaField
          label="Note"
          optional
          value={signoffNote}
          onChange={(e) => setSignoffNote(e.target.value)}
          maxLength={255}
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || !signoffAck || !signoffName.trim()} aria-busy={busy}>
            {busy ? "Saving…" : "Record sign-off"}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setSignoffId(null)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button onClick={() => setHandoffTarget(appointment)} disabled={busy} aria-busy={busy}>
      <CheckCheck size={16} aria-hidden="true" /> Complete pickup
    </Button>
  );
}
