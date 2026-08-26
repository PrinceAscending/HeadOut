import { LiveIndicator } from "@/components/ui/holo/primitives";

/* ═══════════════════════════════════════════════════════════
   Shared degraded/offline state for region panels.
   One grammar for "the signal dropped" everywhere.
   ═══════════════════════════════════════════════════════════ */

export function OfflineState({
  connectingTitle,
  interruptedTitle = "CONNECTION INTERRUPTED",
  connectingNote,
  interruptedNote,
  state,
}: {
  connectingTitle: string;
  interruptedTitle?: string;
  connectingNote: string;
  interruptedNote: string;
  state: "connecting" | "degraded";
}) {
  const connecting = state === "connecting";
  return (
    <div className="space-y-4 py-8 text-center">
      <div className="font-mono text-[10px] tracking-[0.3em] text-wx-amber">
        {connecting ? connectingTitle : interruptedTitle}
      </div>
      <p className="text-[11px] text-wx-dim leading-relaxed">
        {connecting ? connectingNote : interruptedNote}
      </p>
      <LiveIndicator state={state} />
    </div>
  );
}
