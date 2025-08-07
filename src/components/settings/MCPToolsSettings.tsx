import { type NDKProject } from "@nostr-dev-kit/ndk-hooks";
import { Server, Terminal } from "lucide-react";
import { NDKMCPTool } from "@/events";
import { MCPToolSelector } from "../mcp/MCPToolSelector";
import { ProjectEntitySettings } from "./ProjectEntitySettings";
import { getEntityAvatar } from "../../utils/ui-helpers";

interface MCPToolsSettingsProps {
    project: NDKProject;
    editedProject: NDKProject;
    onProjectChanged: () => void;
}

export function MCPToolsSettings({ project, editedProject, onProjectChanged }: MCPToolsSettingsProps) {
    return (
        <ProjectEntitySettings<NDKMCPTool>
            project={project}
            editedProject={editedProject}
            onProjectChanged={onProjectChanged}
            entityType="mcp"
            entityName="MCP Tools"
            entitySingular="MCP tool"
            entityKind={NDKMCPTool.kind}
            emptyIcon={<Server className="w-12 h-12" />}
            emptyMessage="No MCP tools configured"
            emptyDescription="Add MCP servers to extend agent capabilities"
            renderSelector={(props) => (
                <MCPToolSelector
                    selectedTools={props.selectedEntities}
                    onToolsChange={props.onEntitiesChange}
                />
            )}
            renderEntityDetails={(tool) => (
                <>
                    {tool.command && (
                        <div className="flex items-center gap-2 mt-1">
                            <Terminal className="h-3 w-3 text-slate-400" />
                            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">
                                {tool.command}
                            </code>
                        </div>
                    )}
                </>
            )}
            getEntityAvatar={(tool) => 
                getEntityAvatar(tool.id, tool.image, "shapes")
            }
        />
    );
}