import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNDK, useSubscribe, useProfile } from "@nostr-dev-kit/ndk-hooks";
import { Crown, X, Plus, Bot } from "lucide-react";
import { toast } from "sonner";
import { AddAgentsToProjectDialog } from "@/components/dialogs/AddAgentsToProjectDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Component to display agent info with real-time subscription
function AgentDisplay({
  projectAgent,
  isProjectManager,
  onRemove,
  canRemove,
}: {
  projectAgent: { ndkAgentEventId: string };
  isProjectManager: boolean;
  onRemove: () => void;
  canRemove: boolean;
}) {
  // Subscribe to the agent definition event in real-time
  const { events } = useSubscribe(
    projectAgent.ndkAgentEventId
      ? [
          {
            ids: [projectAgent.ndkAgentEventId],
          },
        ]
      : [],
    { closeOnEose: false },
  );

  const agentEvent = events[0];
  const agentDefinition = agentEvent
    ? NDKAgentDefinition.from(agentEvent)
    : null;

  const agentPubkey = agentDefinition?.pubkey;
  const profile = useProfile(agentPubkey || "");

  const displayName =
    agentDefinition?.name || profile?.displayName || profile?.name || "";

  const description =
    agentDefinition?.description || agentDefinition?.content || "";

  const truncateEventId = (eventId: string) => {
    if (!eventId) return "Unknown";
    if (eventId.length <= 20) return eventId;
    return `${eventId.slice(0, 12)}...${eventId.slice(-6)}`;
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">{displayName}</div>
          {isProjectManager && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">
              <Crown className="h-3 w-3" />
              <span className="text-xs font-semibold">PM</span>
            </div>
          )}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {description}
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          Event ID: {truncateEventId(projectAgent.ndkAgentEventId)}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onRemove}
        disabled={!canRemove}
        title={
          !canRemove
            ? isProjectManager
              ? "Reassign Project Manager role before removing"
              : "Cannot remove the last agent"
            : "Remove agent from project"
        }
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ProjectAgentsSettingsProps {
  project: NDKProject;
}

export function ProjectAgentsSettings({ project }: ProjectAgentsSettingsProps) {
  const { ndk } = useNDK();
  const [selectedPM, setSelectedPM] = useState<string>("");
  const [addAgentsDialogOpen, setAddAgentsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get agent definitions from project tags
  const projectAgents = project.agents || [];

  // Subscribe to all agent definition events at once
  const agentEventIds = projectAgents
    .map((agent) => agent.ndkAgentEventId)
    .filter(Boolean);
  const { events: agentEvents } = useSubscribe(
    agentEventIds.length > 0
      ? [
          {
            ids: agentEventIds,
          },
        ]
      : [],
    { closeOnEose: false },
  );

  // Map events to definitions
  const agentDefinitionsMap = new Map<string, NDKAgentDefinition>();
  agentEvents.forEach((event) => {
    const definition = NDKAgentDefinition.from(event);
    agentDefinitionsMap.set(event.id, definition);
  });

  // Set initial PM (first agent) when agents change
  if (projectAgents.length > 0 && !selectedPM) {
    setSelectedPM(projectAgents[0].ndkAgentEventId);
  }

  const handleUpdatePM = async () => {
    if (!ndk || !project || !selectedPM) return;

    setIsUpdating(true);
    try {
      // Get current agent tags
      const agentTags = project.tags.filter((tag) => tag[0] === "agent");

      const newPMTagIndex = agentTags.findIndex(
        (tag) => tag[2] === selectedPM || tag[1] === selectedPM,
      );

      if (newPMTagIndex === -1) return;

      const newPMTag = agentTags[newPMTagIndex];

      // Reorder tags: new PM first, then others
      const otherAgentTags = agentTags.filter(
        (_, index) => index !== newPMTagIndex,
      );
      const reorderedAgentTags = [newPMTag, ...otherAgentTags];

      // Create new tag array with reordered agent tags
      const nonAgentTags = project.tags.filter((tag) => tag[0] !== "agent");
      const newTags = [...nonAgentTags, ...reorderedAgentTags];

      // Update project
      project.tags = newTags;
      await project.publishReplaceable();

      toast.success("Project Manager updated");
    } catch (error) {
      console.error("Failed to update Project Manager:", error);
      toast.error("Failed to update Project Manager");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveAgent = async (agentToRemove: {
    ndkAgentEventId: string;
  }) => {
    if (!ndk || !project) return;

    // Can't remove the PM without reassigning first
    const isCurrentPM = projectAgents.indexOf(agentToRemove) === 0;
    if (isCurrentPM && projectAgents.length > 1) {
      toast.error(
        "Please reassign the Project Manager role before removing this agent",
      );
      return;
    }

    // Can't remove the last agent
    if (projectAgents.length === 1) {
      toast.error("Cannot remove the last agent from the project");
      return;
    }

    try {
      // Filter out the agent tag to remove
      const newTags = project.tags.filter((tag) => {
        if (tag[0] !== "agent") return true;
        return tag[1] !== agentToRemove.ndkAgentEventId;
      });

      // Update project
      project.tags = newTags;
      await project.publishReplaceable();

      toast.success("Agent removed from project");
    } catch (error) {
      console.error("Failed to remove agent:", error);
      toast.error("Failed to remove agent");
    }
  };

  const getAgentIdentifier = (agent: { ndkAgentEventId: string }) => {
    return agent.ndkAgentEventId;
  };

  const getAgentDisplayName = (agent: { ndkAgentEventId: string }) => {
    const definition = agentDefinitionsMap.get(agent.ndkAgentEventId);
    return definition?.name || "Unknown Agent";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Manager</CardTitle>
          <CardDescription>
            The Project Manager is the primary agent for this project and will
            be automatically tagged in new conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectAgents.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label>Current Project Manager</Label>
                <div className="p-3 rounded-md bg-muted/50">
                  <AgentDisplay
                    projectAgent={projectAgents[0]}
                    isProjectManager={true}
                    onRemove={() => {}}
                    canRemove={false}
                  />
                </div>
              </div>

              {projectAgents.length > 1 && (
                <div className="space-y-2">
                  <Label>Change Project Manager</Label>
                  <div className="flex gap-2">
                    <Select value={selectedPM} onValueChange={setSelectedPM}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select new Project Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectAgents.map((agent) => {
                          const identifier = getAgentIdentifier(agent);
                          const displayName = getAgentDisplayName(agent);
                          return (
                            <SelectItem key={identifier} value={identifier}>
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                <span>{displayName}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleUpdatePM}
                      disabled={
                        isUpdating ||
                        selectedPM === getAgentIdentifier(projectAgents[0])
                      }
                    >
                      {isUpdating ? "Updating..." : "Update"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No agents assigned to this project
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Agents</CardTitle>
          <CardDescription>
            {projectAgents.length} agent{projectAgents.length !== 1 ? "s" : ""}{" "}
            assigned to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {projectAgents.map((agent, index) => {
              const isProjectManager = index === 0;

              return (
                <AgentDisplay
                  key={getAgentIdentifier(agent)}
                  projectAgent={agent}
                  isProjectManager={isProjectManager}
                  onRemove={() => handleRemoveAgent(agent)}
                  canRemove={
                    !(isProjectManager && projectAgents.length > 1) &&
                    projectAgents.length > 1
                  }
                />
              );
            })}

            {projectAgents.length === 0 && (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No agents assigned to this project
                </p>
              </div>
            )}

            <Button
              onClick={() => setAddAgentsDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddAgentsToProjectDialog
        open={addAgentsDialogOpen}
        onOpenChange={setAddAgentsDialogOpen}
        project={project}
        existingAgentIds={projectAgents.map((a) => a.ndkAgentEventId)}
      />
    </div>
  );
}
