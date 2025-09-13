import { Bot, Wrench, Server } from "lucide-react";
import { memo } from "react";
import type { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { SelectableCard } from "@/components/common/SelectableCard";

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
          {(agent.tools?.length > 0 || agent.mcpServers?.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.tools?.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wrench className="w-3 h-3" />
                  <span>
                    {agent.tools.length} tool
                    {agent.tools.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {agent.mcpServers?.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Server className="w-3 h-3" />
                  <span>
                    {agent.mcpServers.length} MCP server
                    {agent.mcpServers.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
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
