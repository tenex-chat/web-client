import { useState, useEffect } from "react";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
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
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Server,
  Plus,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import ReactMarkdown from "react-markdown";
import { ToolSelector } from "@/components/common/ToolSelector";
import { useAvailableTools } from "@/hooks/useAvailableTools";
import { useAvailableMCPServers } from "@/hooks/useAvailableMCPServers";
import { AIAssistedPromptEditor } from "./AIAssistedPromptEditor";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forkFromAgent?: NDKAgentDefinition;
  cloneMode?: boolean;
  fromKind0Metadata?: {
    name: string;
    description: string;
    role: string;
    instructions: string;
    useCriteria: string[];
    picture?: string;
  };
  conversionMode?: boolean;
}

type WizardStep =
  | "basics"
  | "prompt"
  | "preview"
  | "tools"
  | "phases"
  | "criteria";

export function CreateAgentDialog({
  open,
  onOpenChange,
  forkFromAgent,
  cloneMode = false,
  fromKind0Metadata,
  conversionMode = false,
}: CreateAgentDialogProps) {
  const { ndk } = useNDK();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>("basics");
  const [showAIAssist, setShowAIAssist] = useState(false);
  const availableTools = useAvailableTools();
  const mcpServers = useAvailableMCPServers();

  // Agent data
  const [agentData, setAgentData] = useState({
    name: "",
    description: "",
    role: "",
    instructions: "",
    useCriteria: "",
    version: "1",
    slug: "",
    tools: [] as string[],
    mcpServers: [] as string[],
    phases: [] as Array<{ name: string; instructions: string }>,
  });

  // Load fork/clone data when agent changes
  useEffect(() => {
    if (fromKind0Metadata && conversionMode) {
      // Convert from kind:0 metadata
      const baseSlug = fromKind0Metadata.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      setAgentData({
        name: fromKind0Metadata.name,
        description: fromKind0Metadata.description || "",
        role: fromKind0Metadata.role || "assistant",
        instructions: fromKind0Metadata.instructions || "",
        useCriteria: fromKind0Metadata.useCriteria?.join("\n") || "",
        version: "1",
        slug: baseSlug,
        tools: [],
        mcpServers: [],
        phases: [],
      });
    } else if (forkFromAgent) {
      if (cloneMode) {
        // For cloning: keep the same version, append " (Copy)" to name, generate unique slug
        const baseName = forkFromAgent.name || "Unnamed";
        const timestamp = Date.now().toString(36).slice(-6);
        const baseSlug = forkFromAgent.slug || baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        setAgentData({
          name: `${baseName} (Copy)`,
          description: forkFromAgent.description || "",
          role: forkFromAgent.role || "",
          instructions: forkFromAgent.instructions || "",
          useCriteria: forkFromAgent.useCriteria?.join("\n") || "",
          version: "1", // Reset version for clones
          slug: `${baseSlug}-copy-${timestamp}`, // Generate unique slug with 'copy' indicator
          tools: forkFromAgent.tools || [],
          mcpServers: forkFromAgent.mcpServers || [],
          phases: forkFromAgent.phases || [],
        });
      } else {
        // For forking: Parse existing version and bump it
        const existingVersion = Number.parseInt(forkFromAgent.version || "1");
        const newVersion = Number.isNaN(existingVersion)
          ? 2
          : existingVersion + 1;

        setAgentData({
          name: `${forkFromAgent.name || "Unnamed"}`,
          description: forkFromAgent.description || "",
          role: forkFromAgent.role || "",
          instructions: forkFromAgent.instructions || "",
          useCriteria: forkFromAgent.useCriteria?.join("\n") || "",
          version: String(newVersion),
          slug: forkFromAgent.slug || "",
          tools: forkFromAgent.tools || [],
          mcpServers: forkFromAgent.mcpServers || [],
          phases: forkFromAgent.phases || [],
        });
      }
    } else {
      // Reset form when not forking/cloning
      setAgentData({
        name: "",
        description: "",
        role: "",
        instructions: "",
        useCriteria: "",
        version: "1",
        slug: "",
        tools: [],
        mcpServers: [],
        phases: [],
      });
    }
    // Reset to first step when dialog opens/closes
    setCurrentStep("basics");
  }, [forkFromAgent, open, cloneMode, fromKind0Metadata, conversionMode]);

  const handleCreate = async () => {
    if (!ndk) {
      toast.error("NDK not initialized");
      return;
    }

    if (!agentData.name.trim()) {
      toast.error("Agent name is required");
      setCurrentStep("basics");
      return;
    }

    if (!agentData.description.trim()) {
      toast.error("Agent description is required");
      setCurrentStep("basics");
      return;
    }

    if (!agentData.instructions.trim()) {
      toast.error("System prompt is required");
      setCurrentStep("prompt");
      return;
    }

    setIsCreating(true);
    try {
      // Always create a new agent (forking creates a new event)
      const agent = new NDKAgentDefinition(ndk);
      agent.name = agentData.name;
      agent.description = agentData.description;
      agent.role = agentData.role;
      agent.instructions = agentData.instructions;
      // Parse use criteria from textarea (split by newlines)
      const criteria = agentData.useCriteria
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      agent.useCriteria = criteria;
      agent.version = agentData.version || undefined;
      agent.slug = agentData.slug || undefined;
      agent.tools = agentData.tools;
      agent.mcpServers = agentData.mcpServers;
      agent.phases = agentData.phases;

      // If forking (not cloning), add an "e" tag to reference the previous version
      if (forkFromAgent && !cloneMode) {
        agent.tags.push(["e", forkFromAgent.id]);
      }
      // If cloning, optionally add a reference tag (not "e") for tracking origin
      if (forkFromAgent && cloneMode) {
        // Add a custom tag to indicate this was cloned from another definition
        // This is for reference only, not for version linking
        agent.tags.push(["cloned-from", forkFromAgent.id]);
      }

      await agent.publish();

      toast.success(
        forkFromAgent
          ? cloneMode
            ? "Agent definition cloned successfully!"
            : "Agent definition forked successfully!"
          : "Agent definition created successfully!",
      );
      onOpenChange(false);

      // Reset form
      setAgentData({
        name: "",
        description: "",
        role: "",
        instructions: "",
        useCriteria: "",
        version: "1",
        slug: "",
        tools: [],
        mcpServers: [],
        phases: [],
      });
    } catch {
      console.error("Failed to save agent");
      toast.error(
        forkFromAgent
          ? cloneMode
            ? "Failed to clone agent definition"
            : "Failed to fork agent definition"
          : "Failed to create agent definition",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case "basics":
        return agentData.name.trim() && agentData.description.trim();
      case "prompt":
        return agentData.instructions.trim().length > 0;
      case "preview":
        return true;
      case "tools":
        return true;
      case "phases":
        return true;
      case "criteria":
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!canGoNext()) return;

    switch (currentStep) {
      case "basics":
        setCurrentStep("prompt");
        break;
      case "prompt":
        setCurrentStep("preview");
        break;
      case "preview":
        setCurrentStep("tools");
        break;
      case "tools":
        setCurrentStep("phases");
        break;
      case "phases":
        setCurrentStep("criteria");
        break;
      case "criteria":
        handleCreate();
        break;
    }
  };

  const goBack = () => {
    switch (currentStep) {
      case "prompt":
        setCurrentStep("basics");
        break;
      case "preview":
        setCurrentStep("prompt");
        break;
      case "tools":
        setCurrentStep("preview");
        break;
      case "phases":
        setCurrentStep("tools");
        break;
      case "criteria":
        setCurrentStep("phases");
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "basics":
        return "Basic Information";
      case "prompt":
        return "System Prompt";
      case "preview":
        return "Preview System Prompt";
      case "tools":
        return "Tools & MCP Servers";
      case "phases":
        return "Phase Definitions";
      case "criteria":
        return "Use Criteria & Version";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "basics":
        return "Define the basic properties of your agent definition";
      case "prompt":
        return "Write the system prompt that defines this agent's behavior and capabilities";
      case "preview":
        return "Review how your system prompt will be displayed";
      case "tools":
        return "Select tools and MCP servers this agent requires";
      case "phases":
        return "Define project phases for PM agents (optional)";
      case "criteria":
        return "Define when this agent should be used and set version";
      default:
        return "";
    }
  };

  const getDialogWidth = () => {
    switch (currentStep) {
      case "prompt":
        return "max-w-3xl";
      case "preview":
        return "max-w-4xl";
      default:
        return "max-w-2xl";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
        className={`${getDialogWidth()} max-h-[90vh] flex flex-col`}
      >
        <DialogHeader>
          <DialogTitle>
            {conversionMode
              ? "Convert Profile to Agent Definition"
              : forkFromAgent
              ? cloneMode
                ? "Clone Agent Definition"
                : "Fork Agent Definition"
              : "Create Agent Definition"}
          </DialogTitle>
          <DialogDescription>
            {getStepTitle()} - {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === "basics" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={agentData.name}
                  onChange={(e) =>
                    setAgentData({ ...agentData, name: e.target.value })
                  }
                  placeholder="My AI Assistant"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={agentData.description}
                  onChange={(e) =>
                    setAgentData({ ...agentData, description: e.target.value })
                  }
                  placeholder="Describe what this agent does..."
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role (optional)</Label>
                <Input
                  id="role"
                  value={agentData.role}
                  onChange={(e) =>
                    setAgentData({ ...agentData, role: e.target.value })
                  }
                  placeholder="e.g., assistant, developer, researcher"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="slug">Slug (optional)</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  A unique identifier for this agent definition (e.g.,
                  "code-assistant", "research-helper")
                </div>
                <Input
                  id="slug"
                  value={agentData.slug}
                  onChange={(e) =>
                    setAgentData({ ...agentData, slug: e.target.value })
                  }
                  placeholder="e.g., my-assistant"
                  pattern="^[a-z0-9-]+$"
                />
              </div>
            </div>
          )}

          {currentStep === "prompt" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="instructions">System Prompt *</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIAssist(true)}
                    type="button"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Edit
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Define the agent's behavior, capabilities, and constraints.
                  Use Markdown for formatting.
                </div>
                <Textarea
                  id="instructions"
                  value={agentData.instructions}
                  onChange={(e) =>
                    setAgentData({ ...agentData, instructions: e.target.value })
                  }
                  placeholder="You are a helpful AI assistant specialized in...

## Core Responsibilities
- Assist users with...
- Provide accurate information about...
- Help solve problems related to...

## Guidelines
1. Always maintain a professional tone
2. Provide clear and concise explanations
3. Ask for clarification when needed

## Constraints
- Do not provide medical or legal advice
- Respect user privacy
- Stay within your area of expertise"
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}

          {currentStep === "preview" && (
            <div className="space-y-4">
              <div className="border rounded-lg p-6 bg-muted/30">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {agentData.instructions ? (
                    <ReactMarkdown>{agentData.instructions}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No system prompt provided
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep("prompt")}
                >
                  Edit System Prompt
                </Button>
              </div>
            </div>
          )}

          {currentStep === "tools" && (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="tools">Required Tools</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Specify which tools this agent needs access to. Users will be
                  notified when adding this agent.
                </div>
                <ToolSelector
                  value={agentData.tools}
                  onChange={(tools) => setAgentData({ ...agentData, tools })}
                  suggestions={availableTools}
                  placeholder="Add tools this agent needs..."
                  icon={<Wrench className="h-3 w-3" />}
                  label="tool"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mcp-servers">Required MCP Servers</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Select MCP servers this agent requires. These will be
                  installed when the agent is added to a project.
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {mcpServers.length > 0 ? (
                    mcpServers.map((server) => (
                      <label
                        key={server.id}
                        className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={agentData.mcpServers.includes(server.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAgentData({
                                ...agentData,
                                mcpServers: [
                                  ...agentData.mcpServers,
                                  server.id,
                                ],
                              });
                            } else {
                              setAgentData({
                                ...agentData,
                                mcpServers: agentData.mcpServers.filter(
                                  (id) => id !== server.id,
                                ),
                              });
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {server.name || "Unnamed MCP Server"}
                            </span>
                          </div>
                          {server.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {server.description}
                            </p>
                          )}
                          {server.command && (
                            <code className="text-xs text-muted-foreground mt-1 block font-mono">
                              {server.command}
                            </code>
                          )}
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No MCP servers available. Create MCP tool events first.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === "phases" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Phase Definitions</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Define project phases for PM agents. Each phase has a name and
                  instructions.
                </div>

                <div className="space-y-3">
                  {agentData.phases.map((phase, index) => (
                    <div
                      key={index}
                      className="border border-border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-3">
                          <Input
                            value={phase.name}
                            onChange={(e) => {
                              const newPhases = [...agentData.phases];
                              newPhases[index].name = e.target.value;
                              setAgentData({ ...agentData, phases: newPhases });
                            }}
                            placeholder="Phase name (e.g., Discovery, Development, Testing)"
                            className="font-medium"
                          />
                          <Textarea
                            value={phase.instructions}
                            onChange={(e) => {
                              const newPhases = [...agentData.phases];
                              newPhases[index].instructions = e.target.value;
                              setAgentData({ ...agentData, phases: newPhases });
                            }}
                            placeholder="Instructions for this phase..."
                            rows={3}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newPhases = agentData.phases.filter(
                              (_, i) => i !== index,
                            );
                            setAgentData({ ...agentData, phases: newPhases });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAgentData({
                        ...agentData,
                        phases: [
                          ...agentData.phases,
                          { name: "", instructions: "" },
                        ],
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Phase
                  </Button>

                  {agentData.phases.length === 0 && (
                    <div className="text-center py-6 border border-dashed rounded-lg">
                      <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No phases defined. Phases are optional and typically
                        used for PM agents.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === "criteria" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="use-criteria">Use Criteria (optional)</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Define conditions when this agent should be used. Enter one
                  criterion per line.
                </div>
                <Textarea
                  id="use-criteria"
                  value={agentData.useCriteria}
                  onChange={(e) =>
                    setAgentData({ ...agentData, useCriteria: e.target.value })
                  }
                  placeholder="User asks for help with coding
User needs research assistance
Task requires creative writing
Complex problem solving is needed"
                  rows={6}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="version">Version</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Version number for this agent definition (use integers: 1, 2,
                  3, etc.)
                </div>
                <Input
                  id="version"
                  value={agentData.version}
                  onChange={(e) =>
                    setAgentData({ ...agentData, version: e.target.value })
                  }
                  placeholder="1"
                  type="number"
                  min="1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep !== "basics" && (
              <Button variant="outline" onClick={goBack} disabled={isCreating}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>

            <Button onClick={goNext} disabled={isCreating || !canGoNext()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {conversionMode ? "Converting..." : forkFromAgent ? (cloneMode ? "Cloning..." : "Forking...") : "Creating..."}
                </>
              ) : currentStep === "criteria" ? (
                conversionMode ? "Convert" : 
                forkFromAgent ? (
                  cloneMode ? "Clone" : "Fork"
                ) : (
                  "Create"
                )
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* AI-Assisted Prompt Editor */}
    <AIAssistedPromptEditor
      isOpen={showAIAssist}
      onOpenChange={setShowAIAssist}
      currentPrompt={agentData.instructions}
      onUpdatePrompt={(newPrompt) => {
        setAgentData({ ...agentData, instructions: newPrompt });
        setShowAIAssist(false);
      }}
    />
  </>
  );
}
