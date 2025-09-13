import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Bot,
  Wrench,
  FileText,
  Check,
  Package,
} from "lucide-react";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { NDKAgentDefinitionPack } from "@/lib/ndk-events/NDKAgentDefinitionPack";
import { NDKMCPTool } from "@/lib/ndk-events/NDKMCPTool";
import { PackCard } from "@/components/agents/PackCard";
import { cn } from "@/lib/utils";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "details" | "agents" | "tools" | "review";

export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const { ndk } = useNDK();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [isCreating, setIsCreating] = useState(false);

  // Project data
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    imageUrl: "",
    repoUrl: "",
  });

  // Selected items
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  // Available items
  const [availableAgents, setAvailableAgents] = useState<NDKAgentDefinition[]>(
    [],
  );
  const [availableTools, setAvailableTools] = useState<NDKMCPTool[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isLoadingTools, setIsLoadingTools] = useState(true);

  // Fetch all packs (kind 34199)
  const { events: rawPacks } = useSubscribe(
    open ? [{ kinds: [NDKAgentDefinitionPack.kind as NDKKind] }] : undefined,
    {},
    [],
  );

  // Convert raw pack events to NDKAgentDefinitionPack instances
  const packs = useMemo(() => {
    return (rawPacks || []).map(
      (event) => new NDKAgentDefinitionPack(ndk || undefined, event.rawEvent()),
    );
  }, [rawPacks, ndk]);

  // Fetch agents
  useEffect(() => {
    if (!ndk || !open) return;

    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const events = await ndk.fetchEvents({
          kinds: [NDKAgentDefinition.kind as NDKKind],
          limit: 100,
        });

        const allAgents = Array.from(events).map((event) => {
          return new NDKAgentDefinition(ndk, event.rawEvent());
        });

        // Group agents by slug (d tag) or name if no slug
        const agentGroups = new Map<string, NDKAgentDefinition[]>();

        allAgents.forEach((agent) => {
          // Use slug as primary grouping key, fall back to name
          const groupKey = agent.slug || agent.name || agent.id;

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
              // First try to compare by created_at timestamp
              const timeA = a.created_at || 0;
              const timeB = b.created_at || 0;
              if (timeA !== timeB) {
                return timeB - timeA; // Newer timestamp first
              }

              // If timestamps are equal, compare by version number
              const versionA = parseInt(a.version || "0");
              const versionB = parseInt(b.version || "0");
              return versionB - versionA; // Higher version first
            });

            latestAgents.push(sorted[0]);
          }
        });

        setAvailableAgents(latestAgents);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        toast.error("Failed to load agents");
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [ndk, open]);

  // Fetch MCP tools
  useEffect(() => {
    if (!ndk || !open) return;

    const fetchTools = async () => {
      setIsLoadingTools(true);
      try {
        const events = await ndk.fetchEvents({
          kinds: [NDKMCPTool.kind as NDKKind],
          limit: 100,
        });

        const tools = Array.from(events).map((event) => {
          return new NDKMCPTool(ndk, event.rawEvent());
        });

        setAvailableTools(tools);
      } catch (error) {
        console.error("Failed to fetch tools:", error);
        toast.error("Failed to load MCP tools");
      } finally {
        setIsLoadingTools(false);
      }
    };

    fetchTools();
  }, [ndk, open]);

  const steps: Step[] = ["details", "agents", "tools", "review"];
  const currentStepIndex = steps.indexOf(currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "details":
        return (
          projectData.name.trim() !== "" &&
          projectData.description.trim() !== ""
        );
      case "agents":
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const handleCreate = async () => {
    if (!ndk) return;

    setIsCreating(true);
    try {
      const project = new NDKProject(ndk);
      project.title = projectData.name;
      project.description = projectData.description;
      project.hashtags = projectData.tags;
      project.picture = projectData.imageUrl || undefined;
      project.repoUrl = projectData.repoUrl || undefined;

      // Add selected agents from pack if any
      if (selectedPackId) {
        const selectedPack = packs.find((p) => p.id === selectedPackId);
        if (selectedPack) {
          selectedPack.agentEventIds.forEach((agentId) => {
            project.addAgent(agentId);
            // Also add the MCP servers required by these agents
            const agent = availableAgents.find((a) => a.id === agentId);
            if (agent?.mcpServers) {
              agent.mcpServers.forEach((mcpId) => {
                project.addMCPTool(mcpId);
              });
            }
          });
        }
      }

      // Add individually selected agents
      selectedAgents.forEach((agentId) => {
        project.addAgent(agentId);
      });

      // Add selected tools
      selectedTools.forEach((toolId) => {
        project.tags.push(["mcp", toolId]);
      });

      await project.publish();

      toast.success("Project created successfully!");
      onOpenChange(false);

      // Navigate to the new project
      navigate({
        to: "/projects/$projectId",
        params: { projectId: project.id },
      });
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "details":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={projectData.name}
                onChange={(e) =>
                  setProjectData({ ...projectData, name: e.target.value })
                }
                placeholder="My Awesome Project"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={projectData.description}
                onChange={(e) =>
                  setProjectData({
                    ...projectData,
                    description: e.target.value,
                  })
                }
                placeholder="Describe your project..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (press Enter to add)</Label>
              <div className="space-y-2">
                <Input
                  id="tags"
                  placeholder="Type a tag and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget;
                      const tag = input.value.trim();
                      if (tag && !projectData.tags.includes(tag)) {
                        setProjectData({
                          ...projectData,
                          tags: [...projectData.tags, tag],
                        });
                        input.value = "";
                      }
                    }
                  }}
                />
                {projectData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {projectData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() =>
                            setProjectData({
                              ...projectData,
                              tags: projectData.tags.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={projectData.imageUrl}
                onChange={(e) =>
                  setProjectData({ ...projectData, imageUrl: e.target.value })
                }
                placeholder="https://example.com/image.png"
              />
            </div>

            <div>
              <Label htmlFor="repo">Repository URL</Label>
              <Input
                id="repo"
                value={projectData.repoUrl}
                onChange={(e) =>
                  setProjectData({ ...projectData, repoUrl: e.target.value })
                }
                placeholder="https://github.com/user/repo"
              />
            </div>
          </div>
        );

      case "agents":
        return (
          <div className="space-y-4">
            {/* Pack Selection Section */}
            {packs.length > 0 && (
              <div className="space-y-3">
                <div>
                  <Label>Start from a Pack (optional)</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a pre-configured collection of agents
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-4 pb-2">
                    {packs.map((pack) => (
                      <div key={pack.id} className="flex-shrink-0">
                        <PackCard
                          pack={pack}
                          onClick={() => {
                            if (selectedPackId === pack.id) {
                              setSelectedPackId(null);
                            } else {
                              setSelectedPackId(pack.id);
                            }
                          }}
                          selected={selectedPackId === pack.id}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {selectedPackId && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <Package className="w-4 h-4 inline mr-2" />
                    Pack selected. All agents from this pack will be added to
                    your project.
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            {packs.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or select individual agents
                  </span>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Select individual agents to work on this project (optional)
            </p>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {isLoadingAgents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : availableAgents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No agents available
                </p>
              ) : (
                <div className="space-y-2">
                  {availableAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedAgents.has(agent.id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-accent",
                      )}
                      onClick={() => {
                        const newSelected = new Set(selectedAgents);
                        if (newSelected.has(agent.id)) {
                          newSelected.delete(agent.id);
                        } else {
                          newSelected.add(agent.id);
                        }
                        setSelectedAgents(newSelected);
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          <Bot className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className="font-medium">
                          {agent.name || "Unnamed Agent"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {agent.description || "No description"}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {agent.role}
                        </Badge>
                      </div>

                      {selectedAgents.has(agent.id) && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        );

      case "tools":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select MCP tools to enable for this project (optional)
            </p>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {isLoadingTools ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : availableTools.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No MCP tools available
                </p>
              ) : (
                <div className="space-y-2">
                  {availableTools.map((tool) => (
                    <div
                      key={tool.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedTools.has(tool.id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-accent",
                      )}
                      onClick={() => {
                        const newSelected = new Set(selectedTools);
                        if (newSelected.has(tool.id)) {
                          newSelected.delete(tool.id);
                        } else {
                          newSelected.add(tool.id);
                        }
                        setSelectedTools(newSelected);
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          <Wrench className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className="font-medium">
                          {tool.name || "Unnamed Tool"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tool.description || "No description"}
                        </p>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {tool.command}
                        </code>
                      </div>

                      {selectedTools.has(tool.id) && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        );

      case "review":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Project Details</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {projectData.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Description:</span>{" "}
                  {projectData.description}
                </p>
                {projectData.tags.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Tags:</span>{" "}
                    {projectData.tags.join(", ")}
                  </p>
                )}
              </div>
            </div>

            {selectedAgents.size > 0 && (
              <div>
                <h4 className="font-medium mb-2">
                  Selected Agents ({selectedAgents.size})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedAgents).map((agentId) => {
                    const agent = availableAgents.find((a) => a.id === agentId);
                    return agent ? (
                      <Badge key={agentId} variant="secondary">
                        {agent.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {selectedTools.size > 0 && (
              <div>
                <h4 className="font-medium mb-2">
                  Selected Tools ({selectedTools.size})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedTools).map((toolId) => {
                    const tool = availableTools.find((t) => t.id === toolId);
                    return tool ? (
                      <Badge key={toolId} variant="outline">
                        {tool.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  const getStepIcon = (step: Step) => {
    switch (step) {
      case "details":
        return <FileText className="h-4 w-4" />;
      case "agents":
        return <Bot className="h-4 w-4" />;
      case "tools":
        return <Wrench className="h-4 w-4" />;
      case "review":
        return <Check className="h-4 w-4" />;
    }
  };

  const getStepTitle = (step: Step) => {
    switch (step) {
      case "details":
        return "Project Details";
      case "agents":
        return "Select Agents";
      case "tools":
        return "MCP Tools";
      case "review":
        return "Review & Create";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {steps.length}:{" "}
            {getStepTitle(currentStep)}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2",
                index <= currentStepIndex
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2",
                  index <= currentStepIndex
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted",
                )}
              >
                {getStepIcon(step)}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8",
                    index < currentStepIndex ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[350px]">{renderStepContent()}</div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isCreating}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep === "review" ? (
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
