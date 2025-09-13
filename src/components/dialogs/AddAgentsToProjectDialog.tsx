import { useState, useMemo } from "react";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import { type NDKKind } from "@nostr-dev-kit/ndk-hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Bot,
  AlertCircle,
  Wrench,
  Server,
  Package,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { NDKAgentDefinitionPack } from "@/lib/ndk-events/NDKAgentDefinitionPack";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { AgentDefinitionCard } from "@/components/agents/AgentDefinitionCard";
import { PackCard } from "@/components/agents/PackCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchBar } from "@/components/common/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  existingAgentIds = [],
}: AddAgentsToProjectDialogProps) {
  const { ndk } = useNDK();
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [packAgentSelection, setPackAgentSelection] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"agents" | "packs">("agents");

  // Fetch all agents (kind 4199)
  const { events: rawAgents } = useSubscribe(
    [{ kinds: [NDKAgentDefinition.kind as NDKKind] }],
    {},
    [],
  );

  // Fetch all packs (kind 34199)
  const { events: rawPacks } = useSubscribe(
    [{ kinds: [NDKAgentDefinitionPack.kind as NDKKind] }],
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
    return latestAgents.filter(
      (agent) => !existingAgentIds.includes(agent.id || ""),
    );
  }, [rawAgents, ndk, existingAgentIds]);

  // Convert raw pack events to NDKAgentDefinitionPack instances
  const packs = useMemo(() => {
    return (rawPacks || []).map(
      (event) => new NDKAgentDefinitionPack(ndk || undefined, event.rawEvent()),
    );
  }, [rawPacks, ndk]);

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

  // Filter packs based on search query
  const filteredPacks = useMemo(() => {
    if (!searchQuery) return packs;

    const query = searchQuery.toLowerCase();
    return packs.filter(
      (pack) =>
        pack.title?.toLowerCase().includes(query) ||
        pack.description?.toLowerCase().includes(query),
    );
  }, [packs, searchQuery]);

  const handleAddAgents = async () => {
    if (!ndk) return;

    // Collect all agent IDs to add (from direct selection and pack selections)
    const allAgentIds = new Set(selectedAgentIds);

    // Add agents from selected packs
    if (selectedPackId && packAgentSelection.has(selectedPackId)) {
      const packAgents = packAgentSelection.get(selectedPackId);
      if (packAgents) {
        packAgents.forEach((id) => allAgentIds.add(id));
      }
    }

    if (allAgentIds.size === 0) return;

    setIsAdding(true);
    try {
      // Collect all MCP servers needed by selected agents
      const mcpServersToAdd = new Set<string>();
      const toolsRequiredByAgents = new Set<string>();

      selectedAgentIds.forEach((agentId) => {
        const agent = agents.find((a) => a.id === agentId);
        if (agent) {
          // Collect MCP servers from this agent
          agent.mcpServers?.forEach((mcpEventId) => {
            mcpServersToAdd.add(mcpEventId);
          });
          // Collect tools for informational purposes
          agent.tools?.forEach((tool) => {
            toolsRequiredByAgents.add(tool);
          });
        }
      });

      // Add each selected agent to the project
      allAgentIds.forEach((agentId) => {
        if (!existingAgentIds.includes(agentId)) {
          project.addAgent(agentId);
        }
      });

      // Add required MCP servers to the project
      // Check which ones are already added to avoid duplicates
      const existingMCPTools = project.mcpTools || [];
      mcpServersToAdd.forEach((mcpEventId) => {
        if (!existingMCPTools.includes(mcpEventId)) {
          project.addMCPTool(mcpEventId);
        }
      });

      // Publish the updated project event
      await project.publishReplaceable();

      let successMessage = `Added ${allAgentIds.size} agent${allAgentIds.size > 1 ? "s" : ""} to the project`;
      if (mcpServersToAdd.size > 0) {
        successMessage += ` and installed ${mcpServersToAdd.size} MCP server${mcpServersToAdd.size > 1 ? "s" : ""}`;
      }
      toast.success(successMessage);

      // Reset and close
      setSelectedAgentIds(new Set());
      setSelectedPackId(null);
      setPackAgentSelection(new Map());
      setSearchQuery("");
      setActiveTab("agents");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add agents to project:", error);
      toast.error("Failed to add agents to project");
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

  const handlePackSelection = async (pack: NDKAgentDefinitionPack) => {
    if (selectedPackId === pack.id) {
      // Deselect if already selected
      setSelectedPackId(null);
      packAgentSelection.delete(pack.id || "");
    } else {
      // Select this pack and initialize all its agents as selected
      setSelectedPackId(pack.id || null);
      const packAgents = new Set(pack.agentEventIds);
      setPackAgentSelection(new Map([[pack.id || "", packAgents]]));
    }
  };

  // Calculate required tools and MCP servers for selected agents
  const selectedAgentsRequirements = useMemo(() => {
    const tools = new Set<string>();
    const mcpServers = new Set<string>();

    // Collect all selected agent IDs
    const allSelectedIds = new Set(selectedAgentIds);
    if (selectedPackId && packAgentSelection.has(selectedPackId)) {
      const packAgents = packAgentSelection.get(selectedPackId);
      if (packAgents) {
        packAgents.forEach((id) => allSelectedIds.add(id));
      }
    }

    allSelectedIds.forEach((agentId) => {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) {
        agent.tools?.forEach((tool) => tools.add(tool));
        agent.mcpServers?.forEach((mcp) => mcpServers.add(mcp));
      }
    });

    return {
      tools: Array.from(tools),
      mcpServers: Array.from(mcpServers),
      totalCount: allSelectedIds.size,
    };
  }, [selectedAgentIds, selectedPackId, packAgentSelection, agents]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Add Agents to Project</DialogTitle>
          <DialogDescription>
            Select agents to add to {project.title || "this project"}. These
            agents will be available for use in this project's context.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "agents" | "packs")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="agents">Individual Agents</TabsTrigger>
              <TabsTrigger value="packs">Agent Packs</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search Bar */}
        <div className="px-6 pb-4 pt-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={
              activeTab === "agents"
                ? "Search agents by name, description, or role..."
                : "Search packs by name or description..."
            }
          />
        </div>

        {/* Show requirements alert if agents have tools or MCP requirements */}
        {selectedAgentsRequirements.totalCount > 0 &&
          (selectedAgentsRequirements.tools.length > 0 ||
            selectedAgentsRequirements.mcpServers.length > 0) && (
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
                            {selectedAgentsRequirements.tools.join(", ")}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedAgentsRequirements.mcpServers.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Server className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            MCP Servers:{" "}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {selectedAgentsRequirements.mcpServers.length}{" "}
                            server
                            {selectedAgentsRequirements.mcpServers.length !== 1
                              ? "s"
                              : ""}{" "}
                            will be installed
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

        {/* Content based on active tab */}
        <ScrollArea className="flex-1 px-6">
          <div className="pb-6">
            {activeTab === "agents" ? (
              // Individual Agents Tab
              filteredAgents.length === 0 ? (
                <EmptyState
                  icon={<Bot className="w-12 h-12" />}
                  title={
                    searchQuery ? "No agents found" : "No available agents"
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
                        selectedAgentIds.has(agent.id || "") &&
                          "ring-2 ring-primary",
                      )}
                    >
                      <AgentDefinitionCard
                        agent={agent}
                        onClick={() => toggleAgentSelection(agent.id || "")}
                      />
                      {selectedAgentIds.has(agent.id || "") && (
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
              )
            ) : // Agent Packs Tab
            filteredPacks.length === 0 ? (
              <EmptyState
                icon={<Package className="w-12 h-12" />}
                title={
                  searchQuery ? "No packs found" : "No agent packs available"
                }
                description={
                  searchQuery
                    ? "Try adjusting your search query"
                    : "No agent packs have been created yet"
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={cn(
                      "relative",
                      selectedPackId === pack.id &&
                        "ring-2 ring-primary rounded-lg",
                    )}
                  >
                    <PackCard
                      pack={pack}
                      onClick={() => handlePackSelection(pack)}
                      selected={selectedPackId === pack.id}
                    />
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
              setSelectedPackId(null);
              setPackAgentSelection(new Map());
              setSearchQuery("");
              setActiveTab("agents");
              onOpenChange(false);
            }}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddAgents}
            disabled={isAdding || selectedAgentsRequirements.totalCount === 0}
          >
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add{" "}
            {selectedAgentsRequirements.totalCount > 0
              ? `${selectedAgentsRequirements.totalCount} `
              : ""}
            Agent{selectedAgentsRequirements.totalCount !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
