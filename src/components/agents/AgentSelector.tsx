import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Bot, AlertCircle, Wrench, Server } from "lucide-react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { ItemSelector } from "@/components/common/ItemSelector";
import { AgentCard } from "./AgentCard";
import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    }
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
      const group = agentGroups.get(groupKey);
      if (group) {
        group.push(agent);
      }
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

  // Calculate requirements for selected agents
  const selectedAgentsRequirements = useMemo(() => {
    const tools = new Set<string>();
    const mcpServers = new Set<string>();
    
    selectedAgents.forEach(agent => {
      agent.tools?.forEach(tool => tools.add(tool));
      agent.mcpServers?.forEach(mcp => mcpServers.add(mcp));
    });
    
    return {
      tools: Array.from(tools),
      mcpServers: Array.from(mcpServers)
    };
  }, [selectedAgents]);

  return (
    <div className="space-y-4">
      {/* Show requirements alert if selected agents have requirements */}
      {selectedAgents.length > 0 && (selectedAgentsRequirements.tools.length > 0 || selectedAgentsRequirements.mcpServers.length > 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Selected agents require:</div>
              {selectedAgentsRequirements.tools.length > 0 && (
                <div className="flex items-start gap-2">
                  <Wrench className="h-3 w-3 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Tools: </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedAgentsRequirements.tools.join(', ')}
                    </span>
                  </div>
                </div>
              )}
              {selectedAgentsRequirements.mcpServers.length > 0 && (
                <div className="flex items-start gap-2">
                  <Server className="h-3 w-3 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">MCP Servers: </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedAgentsRequirements.mcpServers.length} server{selectedAgentsRequirements.mcpServers.length !== 1 ? 's' : ''} will be installed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
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
    </div>
  );
}
