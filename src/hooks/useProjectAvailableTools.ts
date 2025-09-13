import { useMemo } from "react";
import { useProjectStatus } from "@/stores/projects";
import { useProjectsStore } from "@/stores/projects";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { NDKMCPTool } from "@/lib/ndk-events/NDKMCPTool";

/**
 * Gets all tools available in the project.
 * This includes:
 * 1. Tools defined in the project event (mcp tags)
 * 2. Tools currently assigned to agents (from project status)
 * 3. Unassigned tools from project status events (standalone tool tags)
 */
export function useProjectAvailableTools(projectDTag?: string): string[] {
  const projectStatus = useProjectStatus(projectDTag);
  const { getProjectByDTag } = useProjectsStore();
  const project = projectDTag ? getProjectByDTag(projectDTag) : null;

  // Subscribe to MCP tool events to get tool names
  const mcpToolIds = project?.mcpTools || [];
  const { events: toolEvents } = useSubscribe(
    mcpToolIds.length > 0
      ? [{ kinds: [4200 as NDKKind], ids: mcpToolIds }]
      : false,
    { closeOnEose: false },
  );

  const availableTools = useMemo(() => {
    const toolSet = new Set<string>();

    // Add tools from MCP tool events (project configuration)
    if (toolEvents) {
      toolEvents.forEach((event) => {
        const tool = new NDKMCPTool(event.ndk, event.rawEvent());
        if (tool.name) {
          toolSet.add(tool.name);
        }
      });
    }

    // Add tools currently assigned to agents (from project status)
    if (projectStatus?.agents) {
      projectStatus.agents.forEach((agent) => {
        if (agent.tools) {
          agent.tools.forEach((tool) => toolSet.add(tool));
        }
      });
    }

    // Add unassigned tools from the status event
    // These are tool tags without any agent assignments: ["tool", "tool-name"]
    if (projectStatus?.statusEvent) {
      projectStatus.statusEvent.tags.forEach((tag) => {
        if (tag[0] === "tool" && tag[1] && tag.length === 2) {
          // This is an unassigned tool (no agent names in the tag)
          toolSet.add(tag[1]);
        }
      });
    }

    // Return sorted array of unique tools
    return Array.from(toolSet).sort();
  }, [toolEvents, projectStatus]);

  return availableTools;
}
