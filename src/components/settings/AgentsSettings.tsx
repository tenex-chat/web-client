import { type NDKProject } from "@nostr-dev-kit/ndk-hooks";
import { User } from "lucide-react";
import { NDKAgent } from "@/events";
import { AgentSelector } from "../agents/AgentSelector";
import { Badge } from "../ui/badge";
import { ProjectEntitySettings } from "./ProjectEntitySettings";

interface AgentsSettingsProps {
    project: NDKProject;
    editedProject: NDKProject;
    onProjectChanged: () => void;
}

export function AgentsSettings({ project, editedProject, onProjectChanged }: AgentsSettingsProps) {
    return (
        <ProjectEntitySettings<NDKAgent>
            project={project}
            editedProject={editedProject}
            onProjectChanged={onProjectChanged}
            entityType="agent"
            entityName="Project Agents"
            entitySingular="agent"
            entityKind={NDKAgent.kind}
            emptyIcon={<User className="w-12 h-12" />}
            emptyMessage="No agents assigned"
            emptyDescription="Add agents to help work on this project"
            renderSelector={(props) => (
                <AgentSelector
                    selectedAgents={props.selectedEntities}
                    onAgentsChange={props.onEntitiesChange}
                />
            )}
            renderEntityDetails={(agent) => (
                agent.role && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                        {agent.role}
                    </Badge>
                )
            )}
        />
    );
}
