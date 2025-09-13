import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKMCPTool } from "@/lib/ndk-events/NDKMCPTool";
import { NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { Search, Wrench, Code2, Terminal, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddToolsToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: NDKProject;
  existingToolIds: string[];
}

export function AddToolsToProjectDialog({
  open,
  onOpenChange,
  project,
  existingToolIds,
}: AddToolsToProjectDialogProps) {
  const { ndk } = useNDK();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Subscribe to all MCP tools
  const { events: toolEvents, eose } = useSubscribe(
    [{ kinds: [4200 as NDKKind], limit: 100 }],
    { closeOnEose: true },
  );

  // Convert events to tools and filter out already added ones
  const availableTools = toolEvents
    .map((event) => ({
      event,
      tool: NDKMCPTool.from(event),
    }))
    .filter(({ event }) => !existingToolIds.includes(event.id));

  // Filter tools based on search
  const filteredTools = availableTools.filter(({ tool }) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const name = tool.name?.toLowerCase() || "";
    const description = tool.description?.toLowerCase() || "";
    const serverName = tool.serverName?.toLowerCase() || "";
    return (
      name.includes(searchLower) ||
      description.includes(searchLower) ||
      serverName.includes(searchLower)
    );
  });

  // Reset selections when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedTools([]);
      setSearchTerm("");
    }
  }, [open]);

  const handleToggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId],
    );
  };

  const handleAddTools = async () => {
    if (!ndk || !project || selectedTools.length === 0) return;

    setIsAdding(true);
    try {
      // Add new tool tags
      const newTags = [...project.tags];
      selectedTools.forEach((toolId) => {
        newTags.push(["mcp", toolId]);
      });

      // Update project
      project.tags = newTags;
      await project.publishReplaceable();

      toast.success(
        `Added ${selectedTools.length} tool${selectedTools.length !== 1 ? "s" : ""} to project`,
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add tools:", error);
      toast.error("Failed to add tools to project");
    } finally {
      setIsAdding(false);
    }
  };

  const getToolIcon = (tool: NDKMCPTool) => {
    const name = tool.name?.toLowerCase() || "";
    if (
      name.includes("terminal") ||
      name.includes("bash") ||
      name.includes("shell")
    ) {
      return <Terminal className="h-4 w-4" />;
    }
    if (name.includes("code") || name.includes("script")) {
      return <Code2 className="h-4 w-4" />;
    }
    return <Wrench className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add MCP Tools</DialogTitle>
          <DialogDescription>
            Select tools to add to your project. These tools will be available
            to all project agents.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools by name, description, or server..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {!eose ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "No tools found matching your search"
                  : existingToolIds.length > 0
                    ? "All available tools are already added to this project"
                    : "No MCP tools available"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTools.map(({ event, tool }) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleToggleTool(event.id)}
                >
                  <Checkbox
                    checked={selectedTools.includes(event.id)}
                    onCheckedChange={() => handleToggleTool(event.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getToolIcon(tool)}
                      <span className="font-medium truncate">
                        {tool.name || "Unnamed Tool"}
                      </span>
                      {tool.serverName && (
                        <Badge variant="secondary" className="text-xs">
                          {tool.serverName}
                        </Badge>
                      )}
                    </div>
                    {tool.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                    {tool.inputSchema && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.keys(tool.inputSchema.properties || {}).length}{" "}
                        parameters
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedTools.length} tool{selectedTools.length !== 1 ? "s" : ""}{" "}
            selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTools}
              disabled={selectedTools.length === 0 || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {selectedTools.length > 0 && `(${selectedTools.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
