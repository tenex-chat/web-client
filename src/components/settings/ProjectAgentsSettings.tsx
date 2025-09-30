import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import { AddAgentsToProjectDialog } from "@/components/dialogs/AddAgentsToProjectDialog";
import { ProjectManagerSelector } from "./ProjectManagerSelector";
import { AgentList } from "./AgentList";
import {
  publishProjectManagerUpdate,
  publishAgentVersionUpdate,
  publishAgentRemoval,
} from "./projectAgentHelpers";

interface ProjectAgentsSettingsProps {
  project: NDKProject;
}

export function ProjectAgentsSettings({ project }: ProjectAgentsSettingsProps) {
  const { ndk } = useNDK();
  const [selectedPM, setSelectedPM] = useState<string>("");
  const [addAgentsDialogOpen, setAddAgentsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const projectAgents = project.agents || [];

  const projectAgentEventIds = projectAgents
    .map((agent) => agent.ndkAgentEventId)
    .filter(Boolean);

  const { events: agentEvents } = useSubscribe(
    projectAgentEventIds.length > 0
      ? [
          {
            ids: projectAgentEventIds,
          },
        ]
      : [],
    { closeOnEose: false },
  );

  const agentDefinitionsMap = new Map<string, NDKAgentDefinition>();
  agentEvents.forEach((event) => {
    const definition = NDKAgentDefinition.from(event);
    agentDefinitionsMap.set(event.id, definition);
  });

  if (projectAgents.length > 0 && !selectedPM) {
    setSelectedPM(projectAgents[0].ndkAgentEventId);
  }

  const handleUpdatePM = async () => {
    if (!ndk || !project || !selectedPM) return;

    setIsUpdating(true);
    try {
      await publishProjectManagerUpdate(project, selectedPM);
      toast.success("Project Manager updated");
    } catch (error) {
      console.error("Failed to update Project Manager:", error);
      toast.error("Failed to update Project Manager");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAgentVersion = async (oldEventId: string, newEventId: string) => {
    if (!ndk || !project) return;

    try {
      await publishAgentVersionUpdate(project, oldEventId, newEventId);
      toast.success("Agent definition updated to newer version");
    } catch (error) {
      console.error("Failed to update agent version:", error);
      toast.error("Failed to update agent version");
    }
  };

  const handleRemoveAgent = async (agentToRemove: {
    ndkAgentEventId: string;
  }) => {
    if (!ndk || !project) return;

    const isCurrentPM = projectAgents.indexOf(agentToRemove) === 0;
    if (isCurrentPM && projectAgents.length > 1) {
      toast.error(
        "Please reassign the Project Manager role before removing this agent",
      );
      return;
    }

    if (projectAgents.length === 1) {
      toast.error("Cannot remove the last agent from the project");
      return;
    }

    try {
      await publishAgentRemoval(project, agentToRemove.ndkAgentEventId);
      toast.success("Agent removed from project");
    } catch (error) {
      console.error("Failed to remove agent:", error);
      toast.error("Failed to remove agent");
    }
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
          <ProjectManagerSelector
            projectAgents={projectAgents}
            agentDefinitionsMap={agentDefinitionsMap}
            selectedPM={selectedPM}
            onSelectedPMChange={setSelectedPM}
            onUpdatePM={handleUpdatePM}
            onUpdateAgentVersion={handleUpdateAgentVersion}
            isUpdating={isUpdating}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Definitions</CardTitle>
          <CardDescription>
            {projectAgents.length} agent{projectAgents.length !== 1 ? "s" : ""}{" "}
            assigned to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentList
            projectAgents={projectAgents}
            onRemoveAgent={handleRemoveAgent}
            onUpdateAgentVersion={handleUpdateAgentVersion}
            onAddAgents={() => setAddAgentsDialogOpen(true)}
          />
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