import { cn } from "@/lib/utils";
import { getPhaseIndicatorColor } from "@/lib/utils/phase-colors";

interface PhaseIndicatorProps {
  phase?: string | null;
  className?: string;
}

export function PhaseIndicator({ phase, className }: PhaseIndicatorProps) {
  if (!phase) return null;

  const color = getPhaseIndicatorColor(phase);
  const phaseName =
    phase.charAt(0).toUpperCase() + phase.slice(1).toLowerCase();

  return (
    <div
      className={cn("rounded-full", color, className || "w-2 h-2")}
      title={`Phase: ${phaseName}`}
    />
  );
}
