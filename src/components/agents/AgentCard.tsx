import { Bot } from "lucide-react";
import { memo } from "react";
import type { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { SelectableCard } from "../common/SelectableCard";

interface AgentCardProps {
  agent: NDKAgentDefinition;
  isSelected: boolean;
  onSelect: (agent: NDKAgentDefinition) => void;
  onDeselect: (agent: NDKAgentDefinition) => void;
}

export const AgentCard = memo(function AgentCard({
  agent,
  isSelected,
  onSelect,
  onDeselect,
}: AgentCardProps) {
  return (
    <SelectableCard
      item={agent}
      isSelected={isSelected}
      onSelect={onSelect}
      onDeselect={onDeselect}
      renderIcon={() => (
        <Bot className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
      renderTitle={(agent) => agent.name || "Unnamed Agent"}
      renderDescription={(agent) => (
        <>
          {agent.description && <p className="mb-2">{agent.description}</p>}
          {agent.role && (
            <p className="text-primary font-medium">Role: {agent.role}</p>
          )}
        </>
      )}
      renderMeta={(agent) => (
        <div className="flex items-center gap-4">
          {agent.version && <span>v{agent.version}</span>}
        </div>
      )}
      renderTags={(agent) =>
        agent.tags
          .filter((tag) => tag[0] === "t" && tag[1])
          .map((tag) => tag[1] as string)
      }
    />
  );
});
