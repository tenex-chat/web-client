import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { AgentDisplay } from "./AgentDisplay";
import type { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";

interface ProjectManagerSelectorProps {
  projectAgents: Array<{ ndkAgentEventId: string }>;
  agentDefinitionsMap: Map<string, NDKAgentDefinition>;
  selectedPM: string;
  onSelectedPMChange: (value: string) => void;
  onUpdatePM: () => void;
  onUpdateAgentVersion: (oldId: string, newId: string) => Promise<void>;
  isUpdating: boolean;
}

function getAgentIdentifier(agent: { ndkAgentEventId: string }): string {
  return agent.ndkAgentEventId;
}

function getAgentDisplayName(
  agent: { ndkAgentEventId: string },
  agentDefinitionsMap: Map<string, NDKAgentDefinition>,
): string {
  const definition = agentDefinitionsMap.get(agent.ndkAgentEventId);
  return definition?.name || "Unknown Agent";
}

export function ProjectManagerSelector({
  projectAgents,
  agentDefinitionsMap,
  selectedPM,
  onSelectedPMChange,
  onUpdatePM,
  onUpdateAgentVersion,
  isUpdating,
}: ProjectManagerSelectorProps) {
  if (projectAgents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No agents assigned to this project
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Label>Current Project Manager</Label>
        <div className="p-3 rounded-md bg-muted/50">
          <AgentDisplay
            projectAgent={projectAgents[0]}
            isProjectManager={true}
            onRemove={() => {}}
            canRemove={false}
            onUpdate={onUpdateAgentVersion}
          />
        </div>
      </div>

      {projectAgents.length > 1 && (
        <div className="space-y-2">
          <Label>Change Project Manager</Label>
          <div className="flex gap-2">
            <Select value={selectedPM} onValueChange={onSelectedPMChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select new Project Manager" />
              </SelectTrigger>
              <SelectContent>
                {projectAgents.map((agent) => {
                  const identifier = getAgentIdentifier(agent);
                  const displayName = getAgentDisplayName(agent, agentDefinitionsMap);
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
              onClick={onUpdatePM}
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
  );
}