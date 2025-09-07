import { useState, useMemo, useEffect } from 'react';
import { useNDK, useSubscribe, useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Wrench, Server, Package } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NDKAgentDefinitionPack } from '@/lib/ndk-events/NDKAgentDefinitionPack';
import { NDKProject } from '@/lib/ndk-events/NDKProject';
import { PackAgentSelector } from '@/components/agents/PackAgentSelector';
import { type NDKKind } from '@nostr-dev-kit/ndk-hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddPackToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pack: NDKAgentDefinitionPack;
}

export function AddPackToProjectDialog({ 
  open, 
  onOpenChange, 
  pack
}: AddPackToProjectDialogProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectAll, setSelectAll] = useState(true);

  // Fetch only the current user's projects
  const { events: projectEvents } = useSubscribe(
    user ? [{ kinds: [NDKProject.kind as NDKKind], authors: [user.pubkey] }] : [],
    {},
    []
  );

  // Convert to NDKProject instances
  const projects = useMemo(() => {
    return (projectEvents || []).map(
      event => new NDKProject(ndk || undefined, event.rawEvent())
    );
  }, [projectEvents, ndk]);

  // Initialize selection when dialog opens
  useEffect(() => {
    if (open && selectAll && pack) {
      setSelectedAgentIds(new Set(pack.agentEventIds));
    }
  }, [open, selectAll, pack]);

  const handleAddToProject = async () => {
    if (!ndk || selectedAgentIds.size === 0 || !selectedProjectId) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) {
      toast.error('Project not found');
      return;
    }

    setIsAdding(true);
    try {
      // Get existing agents in the project
      const existingAgentIds = project.agentDefinitions || [];
      
      // Collect all MCP servers needed by selected agents
      const mcpServersToAdd = new Set<string>();
      
      // Note: We'll need to fetch agent details if we want to show MCP requirements
      // For now, we'll just add the agents without checking their requirements
      // This could be enhanced by fetching each agent's details when needed

      // Add each selected agent to the project
      selectedAgentIds.forEach(agentId => {
        if (!existingAgentIds.includes(agentId)) {
          project.addAgent(agentId);
        }
      });

      // Add required MCP servers to the project
      const existingMCPTools = project.mcpTools || [];
      mcpServersToAdd.forEach(mcpEventId => {
        if (!existingMCPTools.includes(mcpEventId)) {
          project.addMCPTool(mcpEventId);
        }
      });

      // Publish the updated project event
      await project.publishReplaceable();
      
      let successMessage = `Added ${selectedAgentIds.size} agent${selectedAgentIds.size > 1 ? 's' : ''} from "${pack.title}" to the project`;
      if (mcpServersToAdd.size > 0) {
        successMessage += ` and installed ${mcpServersToAdd.size} MCP server${mcpServersToAdd.size > 1 ? 's' : ''}`;
      }
      toast.success(successMessage);
      
      // Reset and close
      setSelectedAgentIds(new Set());
      setSelectedProjectId('');
      setSelectAll(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add agents to project:', error);
      toast.error('Failed to add agents to project');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    const newSelection = new Set(selectedAgentIds);
    if (newSelection.has(agentId)) {
      newSelection.delete(agentId);
    } else {
      newSelection.add(agentId);
    }
    setSelectedAgentIds(newSelection);
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAgentIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedAgentIds(new Set(pack.agentEventIds));
      setSelectAll(true);
    }
  };

  // For now, we just track count - could be enhanced to fetch requirements on demand
  const selectedAgentsRequirements = useMemo(() => {
    return {
      tools: [],
      mcpServers: [],
      totalCount: selectedAgentIds.size
    };
  }, [selectedAgentIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add Pack to Project
          </DialogTitle>
          <DialogDescription>
            Select which agents from "{pack.title}" to add to your project.
          </DialogDescription>
        </DialogHeader>
        
        {/* Project Selection */}
        <div className="px-6 pb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Project</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter((project): project is typeof project & { id: string } => Boolean(project.id))
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title || 'Untitled Project'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Select All Button */}
        <div className="px-6 pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectAll ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="ml-3 text-sm text-muted-foreground">
            {selectedAgentIds.size} of {pack.agentEventIds.length} agents selected
          </span>
        </div>
        
        {/* Show requirements alert if agents have tools or MCP requirements */}
        {selectedAgentIds.size > 0 && (selectedAgentsRequirements.tools.length > 0 || selectedAgentsRequirements.mcpServers.length > 0) && (
          <div className="px-6 pb-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>Selected agents require:</div>
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
          </div>
        )}
        
        {/* Agent Grid */}
        <ScrollArea className="flex-1 px-6">
          <div className="pb-6">
            {pack.agentEventIds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                This pack doesn't contain any agents
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pack.agentEventIds.map((agentId) => (
                  <PackAgentSelector
                    key={agentId}
                    agentId={agentId}
                    selected={selectedAgentIds.has(agentId)}
                    onToggle={() => toggleAgentSelection(agentId)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedAgentIds(new Set());
              setSelectedProjectId('');
              setSelectAll(true);
              onOpenChange(false);
            }}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddToProject}
            disabled={isAdding || selectedAgentIds.size === 0 || !selectedProjectId}
          >
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add {selectedAgentIds.size > 0 ? `${selectedAgentIds.size} ` : ''}Agent{selectedAgentIds.size !== 1 ? 's' : ''} to Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}