import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Settings, BookOpen } from "lucide-react";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { NDKAgent } from "@/events";
import { ParticipantAvatar } from "../common/ParticipantAvatar";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AgentLessonsTabSimple } from "./AgentLessonsTabSimple";
import { AgentSettingsTab } from "./AgentSettingsTab";
import { useProjectAgents } from "../../stores/project/hooks";

export function AgentProfile() {
    const { projectId, agentSlug } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("lessons");
    
    // Get project agents for fallback info
    const projectAgents = useProjectAgents(projectId);

    // Fetch all agents to find the one matching the slug
    const { events: agents } = useSubscribe<NDKAgent>(
        [{ kinds: NDKAgent.kinds, limit: 100 }],
        { wrap: true },
        []
    );

    // Find the agent matching the slug, ID, or name
    const agent = agents?.find(a => {
        const slug = a.tagValue("slug");
        const name = a.tagValue("name") || a.tagValue("title");
        // Match by slug first, then by ID, then by name as fallback
        return slug === agentSlug || a.id === agentSlug || name === agentSlug;
    });
    
    // Find the project agent info for built-in agents
    const projectAgent = projectAgents.find(pa => pa.name === agentSlug);

    const handleBack = () => {
        if (projectId) {
            navigate(`/project/${projectId}`);
        } else {
            navigate(-1);
        }
    };

    // Handle both NDKAgent and built-in project agents
    const agentPubkey = agent?.pubkey || projectAgent?.pubkey;
    const agentName = agent?.tagValue("name") || agent?.tagValue("title") || projectAgent?.name || agentSlug || "Unnamed Agent";
    const agentDescription = agent?.tagValue("description") || "";
    const agentSlugValue = agent?.tagValue("slug") || agentSlug || "";
    
    // If we have neither an NDKAgent nor a project agent, show not found
    if (!agent && !projectAgent) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Agent not found</p>
                    <Button onClick={handleBack} variant="outline">
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handleBack}
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        
                        <div className="flex items-center gap-4">
                            {agentPubkey && (
                                <ParticipantAvatar 
                                    pubkey={agentPubkey} 
                                    className="w-12 h-12"
                                />
                            )}
                            <div>
                                <h1 className="text-xl font-semibold">{agentName}</h1>
                                {agentDescription && (
                                    <p className="text-sm text-muted-foreground">
                                        {agentDescription}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="border-b border-border">
                        <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
                            <TabsTrigger 
                                value="lessons" 
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-3"
                            >
                                <BookOpen className="w-4 h-4 mr-2" />
                                Lessons
                            </TabsTrigger>
                            <TabsTrigger 
                                value="settings"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-3"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <TabsContent value="lessons" className="h-full m-0">
                            {agent ? (
                                <AgentLessonsTabSimple agent={agent} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <BookOpen className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        No lessons available
                                    </h3>
                                    <p className="text-muted-foreground max-w-sm">
                                        This is a built-in agent. Lessons will appear here when available.
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="settings" className="h-full m-0">
                            <AgentSettingsTab agent={agent || undefined} agentSlug={agentSlugValue} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}