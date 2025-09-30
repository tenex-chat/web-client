import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentDisplay } from "./AgentDisplay";

interface AgentListProps {
  projectAgents: Array<{ ndkAgentEventId: string }>;
  onRemoveAgent: (agent: { ndkAgentEventId: string }) => void;
  onUpdateAgentVersion: (oldId: string, newId: string) => Promise<void>;
  onAddAgents: () => void;
}

function getAgentIdentifier(agent: { ndkAgentEventId: string }): string {
  return agent.ndkAgentEventId;
}

function canRemoveAgent(index: number, totalAgents: number): boolean {
  const isProjectManager = index === 0;
  return !(isProjectManager && totalAgents > 1) && totalAgents > 1;
}

export function AgentList({
  projectAgents,
  onRemoveAgent,
  onUpdateAgentVersion,
  onAddAgents,
}: AgentListProps) {
  return (
    <div className="space-y-2">
      {projectAgents.map((agent, index) => {
        const isProjectManager = index === 0;

        return (
          <AgentDisplay
            key={getAgentIdentifier(agent)}
            projectAgent={agent}
            isProjectManager={isProjectManager}
            onRemove={() => onRemoveAgent(agent)}
            canRemove={canRemoveAgent(index, projectAgents.length)}
            onUpdate={onUpdateAgentVersion}
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
        onClick={onAddAgents}
        variant="outline"
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Agent
      </Button>
    </div>
  );
}