import { NDKMCPTool } from "@/events";
import { useEntityActions } from "./useEntityActions";

export function useMCPToolActions() {
    const { copiedId, copyEntityId, deleteEntity } = useEntityActions<NDKMCPTool>();

    const copyToolId = (tool: NDKMCPTool) => copyEntityId(tool);
    
    const deleteTool = (tool: NDKMCPTool, onSuccess?: () => void) => 
        deleteEntity(tool, tool.name || "this MCP tool", onSuccess);

    return {
        copiedId,
        copyToolId,
        deleteTool,
    };
}