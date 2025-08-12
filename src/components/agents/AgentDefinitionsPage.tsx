import { type NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Bot, Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EVENT_KINDS } from "../../lib/constants";
import { NDKAgentDefinition } from "../../lib/ndk-events/NDKAgentDefinition";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { EmptyState } from "../common/EmptyState";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks';
import { CreateAgentDialog } from "../dialogs/CreateAgentDialog";
import { AgentDefinitionCard } from "./AgentDefinitionCard";

type TabType = "all" | "owned" | "subscribed";

export function AgentDefinitionsPage() {
    const { ndk } = useNDK();
    const user = useNDKCurrentUser();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    // Fetch all agents (kind 4199)
    const { events: rawAgents } = useSubscribe(
        [{ kinds: [EVENT_KINDS.AGENT_CONFIG as NDKKind] }],
        {},
        []
    );

    // Convert raw events to NDKAgentDefinition instances
    const agents = useMemo(
        () => (rawAgents || []).map((event) => new NDKAgentDefinition(ndk || undefined, event.rawEvent())),
        [rawAgents, ndk]
    );

    // Filter agents based on search query and tab
    const filteredAgents = useMemo(() => {
        let filtered = agents;

        // Filter by tab
        if (activeTab === "owned" && user) {
            filtered = filtered.filter(agent => agent.pubkey === user.pubkey);
        } else if (activeTab === "subscribed" && user) {
            // TODO: Implement subscription filtering when we have agent subscriptions
            filtered = filtered.filter(agent => agent.pubkey !== user.pubkey);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(agent => 
                agent.name?.toLowerCase().includes(query) ||
                agent.description?.toLowerCase().includes(query) ||
                agent.role?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [agents, searchQuery, activeTab, user]);

    const handleAgentClick = (agent: NDKAgentDefinition) => {
        navigate({
            to: '/agent-definition/$agentDefinitionEventId',
            params: { agentDefinitionEventId: agent.id }
        });
    };

    const handleCreateAgent = () => {
        setCreateDialogOpen(true);
    };

    const getRoleColor = (role: string) => {
        const roleColors: Record<string, string> = {
            assistant: "bg-blue-500/10 text-blue-500",
            developer: "bg-green-500/10 text-green-500",
            researcher: "bg-purple-500/10 text-purple-500",
            designer: "bg-pink-500/10 text-pink-500",
            analyst: "bg-orange-500/10 text-orange-500",
        };
        return roleColors[role] || "bg-gray-500/10 text-gray-500";
    };

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-card border-b border-border">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-semibold">Agent Definitions</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                AI assistant templates that can be instantiated for your projects
                            </p>
                        </div>
                        {user && (
                            <Button onClick={handleCreateAgent}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Agent
                            </Button>
                        )}
                    </div>

                    {/* Search and Tabs */}
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search agents by name, description, or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {user && (
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="all">All Definitions</TabsTrigger>
                                    <TabsTrigger value="owned">My Definitions</TabsTrigger>
                                    <TabsTrigger value="subscribed">Subscribed</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="max-w-6xl mx-auto p-4">
                    {filteredAgents.length === 0 ? (
                        <EmptyState
                            icon={<Bot className="w-12 h-12" />}
                            title={searchQuery ? "No agent definitions found" : "No agent definitions yet"}
                            description={
                                searchQuery 
                                    ? "Try adjusting your search query"
                                    : user 
                                        ? "Create your first agent definition to get started"
                                        : "Sign in to create and manage agent definitions"
                            }
                        />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredAgents.map((agent) => (
                                <AgentDefinitionCard
                                    key={agent.id}
                                    agent={agent}
                                    onClick={() => handleAgentClick(agent)}
                                    getRoleColor={getRoleColor}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            <CreateAgentDialog 
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />
        </div>
    );
}