import { Terminal } from "lucide-react";
import { NDKMCPTool } from "@/events";
import { EntityListSidebar } from "@/components/common/EntityListSidebar";
import { ProfileDisplay } from "../ProfileDisplay";

interface MCPToolListProps {
    tools: NDKMCPTool[];
    selectedTool: NDKMCPTool | null;
    onBack: () => void;
    onToolSelect: (tool: NDKMCPTool) => void;
    onCreateNew: () => void;
}

export function MCPToolList({
    tools,
    selectedTool,
    onBack,
    onToolSelect,
    onCreateNew,
}: MCPToolListProps) {
    return (
        <EntityListSidebar<NDKMCPTool>
            title="MCP Tools"
            items={tools}
            selectedItem={selectedTool}
            onBack={onBack}
            onSelect={onToolSelect}
            onCreateNew={onCreateNew}
            getItemTitle={(tool) => tool.name || "Unnamed Tool"}
            getItemDescription={(tool) => tool.description}
            renderItemExtra={(tool) => (
                <>
                    {tool.command && (
                        <div className="flex items-center gap-2 mt-2">
                            <Terminal className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                {tool.command}
                            </code>
                        </div>
                    )}
                    <div className="mt-2">
                        <ProfileDisplay
                            pubkey={tool.pubkey}
                            size="sm"
                            className="text-xs text-muted-foreground"
                            nameClassName="text-xs"
                        />
                    </div>
                </>
            )}
            createButtonText="Add new MCP tool"
            searchPlaceholder="Search MCP tools..."
            className="w-full md:w-80 lg:w-96"
        />
    );
}