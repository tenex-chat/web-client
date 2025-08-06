import type { NDKAgent } from "@/events";
import { useEntityActions } from "./useEntityActions";

export function useAgentActions() {
    const { copiedId, copyEntityId, deleteEntity, DeleteConfirmationDialog } = useEntityActions<NDKAgent>();

    const copyAgentId = (agent: NDKAgent) => copyEntityId(agent);
    
    const deleteAgent = (agent: NDKAgent, onSuccess?: () => void) => 
        deleteEntity(agent, agent.title || agent.name || "this agent", onSuccess);

    return {
        copiedId,
        copyAgentId,
        deleteAgent,
        DeleteConfirmationDialog,
    };
}
