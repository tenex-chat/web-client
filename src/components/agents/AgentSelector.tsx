import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Bot } from "lucide-react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { ItemSelector } from "@/components/common/ItemSelector";
import { AgentCard } from "./AgentCard";
import { useMemo } from "react";

interface AgentSelectorProps {
  selectedAgents: NDKAgentDefinition[];
  onAgentsChange: (agents: NDKAgentDefinition[]) => void;
  filterType?: "all" | "agent" | "mcp-server";
}

export function AgentSelector({
  selectedAgents,
  onAgentsChange,
}: AgentSelectorProps) {
  const { events: allEvents } = useSubscribe(
    [{ kinds: [NDKAgentDefinition.kind], limit: 100 }],
    {
      closeOnEose: false,
      groupable: false,
    },
  );

  // Convert raw events to NDKAgentDefinition instances and deduplicate
  const agentEvents = useMemo(() => {
    const allAgents = allEvents.map((event) => {
      const agent = new NDKAgentDefinition(event.ndk);
      Object.assign(agent, event);
      return agent;
    });

    // Group agents by slug (d tag) or name if no slug
    const agentGroups = new Map<string, NDKAgentDefinition[]>();

    allAgents.forEach((agent) => {
      // Use slug as primary grouping key, fall back to name
      const groupKey = agent.slug || agent.name || agent.id;

      if (!agentGroups.has(groupKey)) {
        agentGroups.set(groupKey, []);
      }
      agentGroups.get(groupKey)!.push(agent);
    });

    // For each group, keep only the latest version
    const latestAgents: NDKAgentDefinition[] = [];

    agentGroups.forEach((groupAgents) => {
      if (groupAgents.length === 1) {
        latestAgents.push(groupAgents[0]);
      } else {
        // Sort by created_at timestamp (newest first) and version number
        const sorted = groupAgents.sort((a, b) => {
          // First try to compare by created_at timestamp
          const timeA = a.created_at || 0;
          const timeB = b.created_at || 0;
          if (timeA !== timeB) {
            return timeB - timeA; // Newer timestamp first
          }

          // If timestamps are equal, compare by version number
          const versionA = parseInt(a.version || "0");
          const versionB = parseInt(b.version || "0");
          return versionB - versionA; // Higher version first
        });

        latestAgents.push(sorted[0]);
      }
    });

    return latestAgents;
  }, [allEvents]);

  const handleAgentSelect = (agent: NDKAgentDefinition) => {
    if (!selectedAgents.find((a) => a.id === agent.id)) {
      onAgentsChange([...selectedAgents, agent]);
    }
  };

  const handleAgentDeselect = (agent: NDKAgentDefinition) => {
    onAgentsChange(selectedAgents.filter((a) => a.id !== agent.id));
  };

  return (
    <ItemSelector
      items={agentEvents}
      selectedItems={selectedAgents}
      onItemsChange={onAgentsChange}
      searchPlaceholder="Search agents..."
      filterLabel="Filters"
      emptyStateIcon={<Bot className="w-6 h-6 text-muted-foreground" />}
      emptyStateTitle="No agents found"
      renderCard={(agent, isSelected) => (
        <AgentCard
          agent={agent}
          isSelected={isSelected}
          onSelect={handleAgentSelect}
          onDeselect={handleAgentDeselect}
        />
      )}
      getItemId={(agent) => agent.id || ""}
      getItemTags={(agent) =>
        agent.tags
          .filter((tag) => tag[0] === "t" && tag[1])
          .map((tag) => tag[1] as string)
      }
      searchFilter={(agent, searchTerm) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          agent.name?.toLowerCase().includes(searchLower) ||
          agent.description?.toLowerCase().includes(searchLower) ||
          agent.role?.toLowerCase().includes(searchLower) ||
          false
        );
      }}
    />
  );
}
