import type { NDKProject } from "@nostr-dev-kit/ndk-hooks";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Users, BookOpen, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { NDKAgent } from "@/events";
import { ParticipantAvatar } from "../common/ParticipantAvatar";
import { useProjectAgents } from "../../stores/project/hooks";
import { useAgentLessonsByEventId } from "../../hooks/useAgentLessons";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AgentSelector } from "../agents/AgentSelector";
import { toast } from "sonner";

interface AgentsTabContentProps {
    project: NDKProject;
}

interface AgentItemProps {
    agent: NDKAgent | null;
    projectAgent: { pubkey: string; name: string };
    projectId: string;
}

function AgentItem({ agent, projectAgent, projectId }: AgentItemProps) {
    const navigate = useNavigate();
    const lessons = useAgentLessonsByEventId(agent?.id);
    
    const handleClick = () => {
        // Use agent slug/id if available, otherwise use the project agent name
        let identifier: string | undefined;
        
        if (agent) {
            identifier = agent.tagValue("slug") || agent.id;
        } else {
            // For built-in agents without NDKAgent events, use the name
            identifier = projectAgent.name;
        }
        
        if (identifier) {
            navigate(`/project/${projectId}/agent/${identifier}`);
        }
    };
    
    const agentName = agent?.tagValue("name") || agent?.tagValue("title") || projectAgent.name || "Unnamed Agent";
    const agentDescription = agent?.tagValue("description") || "";
    
    return (
        <div 
            className="flex items-center space-x-4 p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={handleClick}
        >
            <ParticipantAvatar 
                pubkey={projectAgent.pubkey} 
                className="w-12 h-12 flex-shrink-0" 
            />
            
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">
                    {agentName}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                    {agentDescription || "No description available"}
                </p>
            </div>
            
            <div className="flex items-center space-x-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-medium">{lessons.length}</span>
                <span className="text-sm">lessons</span>
            </div>
        </div>
    );
}

export function AgentsTabContent({ project }: AgentsTabContentProps) {
    const { ndk } = useNDK();
    const projectAgents = useProjectAgents(project.tagId());
    const [showAgentSelector, setShowAgentSelector] = useState(false);
    const [isAddingAgents, setIsAddingAgents] = useState(false);
    
    // Fetch all NDKAgent events to match with project agents
    const { events: allAgents } = useSubscribe<NDKAgent>(
        [{ kinds: NDKAgent.kinds, limit: 100 }],
        { wrap: true },
        []
    );
    
    // Map project agents to their corresponding NDKAgent objects
    const agentMap = useMemo(() => {
        const map = new Map<string, NDKAgent>();
        if (allAgents) {
            for (const agent of allAgents) {
                map.set(agent.pubkey, agent);
            }
        }
        return map;
    }, [allAgents]);

    const handleAddAgents = async (selectedAgents: NDKAgent[]) => {
        if (!ndk || selectedAgents.length === 0) return;

        console.log(selectedAgents)

        setIsAddingAgents(true);
        try {
            // Get current agent IDs
            const currentAgentIds = new Set(
                project.tags
                    .filter((tag) => tag[0] === "agent" && tag[1])
                    .map((tag) => tag[1] as string)
            );

            // Filter out agents that are already in the project and agents without IDs (built-in agents)
            const newAgents = selectedAgents.filter(
                (agent) => agent.id && !currentAgentIds.has(agent.id)
            );

            if (newAgents.length === 0) {
                toast.info("No valid agents to add. Built-in agents cannot be added to projects.");
                setShowAgentSelector(false);
                return;
            }

            // Add new agent tags to the project
            for (const agent of newAgents) {
                if (agent.id) {
                    project.tags.push(["agent", agent.id]);
                }
            }

            // Publish the updated project
            await project.publishReplaceable();

            toast.success(
                `Added ${newAgents.length} agent${newAgents.length > 1 ? "s" : ""} to the project`
            );
            setShowAgentSelector(false);
        } catch (error) {
            console.error("Failed to add agents:", error);
            toast.error("Failed to add agents to the project");
        } finally {
            setIsAddingAgents(false);
        }
    };

    if (projectAgents.length === 0) {
        return (
            <>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No agents yet
                    </h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
                        Agents will appear here when they are added to this project.
                    </p>
                    <Button onClick={() => setShowAgentSelector(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Agent
                    </Button>
                </div>

                {/* Agent Selector Dialog */}
                <Dialog open={showAgentSelector} onOpenChange={setShowAgentSelector}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Select Agents</DialogTitle>
                        </DialogHeader>
                        <AgentSelector
                            selectedAgents={[]}
                            onAgentsChange={handleAddAgents}
                        />
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <>
            <div className="flex flex-col space-y-4">
                {/* Header with Add Agent button */}
                <div className="flex justify-between items-center">
                    <h3 className="text-sm text-muted-foreground">
                        {projectAgents.length} agent{projectAgents.length !== 1 ? "s" : ""} assigned
                    </h3>
                    <Button 
                        onClick={() => setShowAgentSelector(true)}
                        size="sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Agent
                    </Button>
                </div>

                {/* Agent list */}
                <div className="flex flex-col space-y-3">
                    {projectAgents.map((projectAgent) => {
                        const fullAgent = agentMap.get(projectAgent.pubkey);
                        return (
                            <AgentItem 
                                key={projectAgent.pubkey} 
                                agent={fullAgent || null}
                                projectAgent={projectAgent}
                                projectId={project.tagId()} 
                            />
                        );
                    })}
                </div>
            </div>

            {/* Agent Selector Dialog */}
            <Dialog open={showAgentSelector} onOpenChange={setShowAgentSelector}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Select Agents</DialogTitle>
                    </DialogHeader>
                    <AgentSelector
                        selectedAgents={allAgents?.filter(a => 
                            projectAgents.some(pa => pa.pubkey === a.pubkey)
                        ) || []}
                        onAgentsChange={handleAddAgents}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}