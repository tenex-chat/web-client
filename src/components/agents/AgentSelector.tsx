import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Bot } from "lucide-react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { ItemSelector } from "../common/ItemSelector";
import { AgentCard } from "./AgentCard";

interface AgentSelectorProps {
    selectedAgents: NDKAgentDefinition[];
    onAgentsChange: (agents: NDKAgentDefinition[]) => void;
    filterType?: 'all' | 'agent' | 'mcp-server';
}

export function AgentSelector({ selectedAgents, onAgentsChange }: AgentSelectorProps) {
    const { events: allEvents } = useSubscribe(
        [{ kinds: [NDKAgentDefinition.kind], limit: 100 }],
        {
            closeOnEose: false,
            groupable: false
        }
    );

    // Convert raw events to NDKAgentDefinition instances
    const agentEvents = allEvents.map(event => {
        const agent = new NDKAgentDefinition(event.ndk);
        Object.assign(agent, event);
        return agent;
    });

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
                agent.tags.filter((tag) => tag[0] === "t" && tag[1]).map((tag) => tag[1] as string)
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