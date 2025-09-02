import { useEvent, useNDK } from "@nostr-dev-kit/ndk-hooks";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { AgentDefinitionCard } from "./AgentDefinitionCard";
import { cn } from "@/lib/utils";

interface PackAgentSelectorProps {
  agentId: string;
  selected: boolean;
  onToggle: () => void;
}

export function PackAgentSelector({ agentId, selected, onToggle }: PackAgentSelectorProps) {
  const { ndk } = useNDK();
  const event = useEvent(agentId);
  
  if (!event || !ndk) {
    return null;
  }
  
  const agent = new NDKAgentDefinition(ndk, event);
  
  return (
    <div
      className={cn(
        "relative rounded-lg transition-all cursor-pointer",
        selected && "ring-2 ring-primary"
      )}
      onClick={onToggle}
    >
      <AgentDefinitionCard agent={agent} />
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}