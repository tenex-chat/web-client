import { useState, useMemo } from 'react';
import { useNDK, useSubscribe } from '@nostr-dev-kit/ndk-hooks';
import { toast } from 'sonner';
import { type NDKKind } from '@nostr-dev-kit/ndk';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, AlertCircle, Wrench, Server } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NDKAgentDefinition } from '@/lib/ndk-events/NDKAgentDefinition';
import { NDKProject } from '@/lib/ndk-events/NDKProject';
import { AgentDefinitionCard } from '@/components/agents/AgentDefinitionCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar } from '@/components/common/SearchBar';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

interface AddAgentsToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: NDKProject;
  existingAgentIds?: string[];
}

export function AddAgentsToProjectDialog({ 
  open, 
  onOpenChange, 
  project,
  existingAgentIds = []
}: AddAgentsToProjectDialogProps) {
  const { ndk } = useNDK();
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all agents (kind 4199)
  const { events: rawAgents } = useSubscribe(
    [{ kinds: [NDKAgentDefinition.kind as NDKKind] }],
    {},
    [],
  );

  // Convert raw events to NDKAgentDefinition instances and filter to latest versions only
  const agents = useMemo(() => {
    const allAgents = (rawAgents || []).map(
      (event) => new NDKAgentDefinition(ndk || undefined, event.rawEvent()),
    );

    // Group agents by slug/d-tag/name to show only latest version
    const agentGroups = new Map<string, NDKAgentDefinition[]>();

    allAgents.forEach((agent) => {
      const identifier = agent.slug || agent.dTag || agent.name || agent.id;
      const groupKey = identifier;

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
          const timeA = a.created_at || 0;
          const timeB = b.created_at || 0;
          if (timeA !== timeB) {
            return timeB - timeA;
          }
          const versionA = parseInt(a.version || "0");
          const versionB = parseInt(b.version || "0");
          return versionB - versionA;
        });
        latestAgents.push(sorted[0]);
      }
    });

    // Filter out agents that are already in the project
    return latestAgents.filter(agent => !existingAgentIds.includes(agent.id || ''));
  }, [rawAgents, ndk, existingAgentIds]);

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    
    const query = searchQuery.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.name?.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.role?.toLowerCase().includes(query),
    );
  }, [agents, searchQuery]);

  const handleAddAgents = async () => {
    if (!ndk || selectedAgentIds.size === 0) return;

    setIsAdding(true);
    try {
      // Collect all MCP servers needed by selected agents
      const mcpServersToAdd = new Set<string>();
      const toolsRequiredByAgents = new Set<string>();
      
      selectedAgentIds.forEach(agentId => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
          // Collect MCP servers from this agent
          agent.mcpServers?.forEach(mcpEventId => {
            mcpServersToAdd.add(mcpEventId);
          });
          // Collect tools for informational purposes
          agent.tools?.forEach(tool => {
            toolsRequiredByAgents.add(tool);
          });
        }
      });

      // Add each selected agent to the project
      selectedAgentIds.forEach(agentId => {
        if (!existingAgentIds.includes(agentId)) {
          project.addAgent(agentId);
        }
      });

      // Add required MCP servers to the project
      // Check which ones are already added to avoid duplicates
      const existingMCPTools = project.mcpTools || [];
      mcpServersToAdd.forEach(mcpEventId => {
        if (!existingMCPTools.includes(mcpEventId)) {
          project.addMCPTool(mcpEventId);
        }
      });

      // Publish the updated project event
      await project.publishReplaceable();
      
      let successMessage = `Added ${selectedAgentIds.size} agent${selectedAgentIds.size > 1 ? 's' : ''} to the project`;
      if (mcpServersToAdd.size > 0) {
        successMessage += ` and installed ${mcpServersToAdd.size} MCP server${mcpServersToAdd.size > 1 ? 's' : ''}`;
      }
      toast.success(successMessage);
      
      // Reset and close
      setSelectedAgentIds(new Set());
      setSearchQuery('');
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
  };

  // Calculate required tools and MCP servers for selected agents
  const selectedAgentsRequirements = useMemo(() => {
    const tools = new Set<string>();
    const mcpServers = new Set<string>();
    
    selectedAgentIds.forEach(agentId => {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        agent.tools?.forEach(tool => tools.add(tool));
        agent.mcpServers?.forEach(mcp => mcpServers.add(mcp));
      }
    });
    
    return {
      tools: Array.from(tools),
      mcpServers: Array.from(mcpServers)
    };
  }, [selectedAgentIds, agents]);

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      assistant: "bg-blue-500/10 text-blue-500",
      developer: "bg-green-500/10 text-green-500",
      researcher: "bg-purple-500/10 text-purple-500",
      designer: "bg-pink-500/10 text-pink-500",
      analyst: "bg-orange-500/10 text-orange-500",
    };
    return roleColors[role] || "bg-gray-500/10 text-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Add Agents to Project</DialogTitle>
          <DialogDescription>
            Select agents to add to {project.title || 'this project'}. 
            These agents will be available for use in this project's context.
          </DialogDescription>
        </DialogHeader>
        
        {/* Search Bar */}
        <div className="px-6 pb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search agents by name, description, or role..."
          />
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
        
        {/* Agent Grid with proper scrolling */}
        <ScrollArea className="flex-1 px-6">
          <div className="pb-6">
            {filteredAgents.length === 0 ? (
              <EmptyState
                icon={<Bot className="w-12 h-12" />}
                title={
                  searchQuery
                    ? "No agents found"
                    : "No available agents"
                }
                description={
                  searchQuery
                    ? "Try adjusting your search query"
                    : existingAgentIds.length > 0
                      ? "All available agents are already added to this project"
                      : "No agent definitions available"
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={cn(
                      "relative rounded-lg transition-all",
                      selectedAgentIds.has(agent.id || '') && "ring-2 ring-primary"
                    )}
                  >
                    <AgentDefinitionCard
                      agent={agent}
                      onClick={() => toggleAgentSelection(agent.id || '')}
                      getRoleColor={getRoleColor}
                    />
                    {selectedAgentIds.has(agent.id || '') && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-primary-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
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
              setSearchQuery('');
              onOpenChange(false);
            }}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddAgents}
            disabled={isAdding || selectedAgentIds.size === 0}
          >
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add {selectedAgentIds.size > 0 ? `${selectedAgentIds.size} ` : ''}Agent{selectedAgentIds.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}