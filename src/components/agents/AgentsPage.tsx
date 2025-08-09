import { type NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Bot, Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EVENT_KINDS } from "../../lib/constants";
import { NDKAgent } from "../../lib/ndk-events/NDKAgent";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { EmptyState } from "../common/EmptyState";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks';

type TabType = "all" | "owned" | "subscribed";

export function AgentsPage() {
    const { ndk } = useNDK();
    const user = useNDKCurrentUser();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>("all");

    // Fetch all agents (kind 4199)
    const { events: rawAgents } = useSubscribe(
        [{ kinds: [EVENT_KINDS.AGENT_CONFIG as NDKKind] }],
        {},
        []
    );

    // Convert raw events to NDKAgent instances
    const agents = useMemo(
        () => (rawAgents || []).map((event) => new NDKAgent(ndk || undefined, event.rawEvent())),
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

    const handleAgentClick = (agent: NDKAgent) => {
        navigate({
            to: '/agents/$agentId',
            params: { agentId: agent.pubkey }
        });
    };

    const handleCreateAgent = () => {
        // Agent creation dialog not yet implemented
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
                            <h1 className="text-2xl font-semibold">Agents</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                AI assistants that help you with your projects
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
                                    <TabsTrigger value="all">All Agents</TabsTrigger>
                                    <TabsTrigger value="owned">My Agents</TabsTrigger>
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
                            title={searchQuery ? "No agents found" : "No agents yet"}
                            description={
                                searchQuery 
                                    ? "Try adjusting your search query"
                                    : user 
                                        ? "Create your first agent to get started"
                                        : "Sign in to create and manage agents"
                            }
                        />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredAgents.map((agent) => (
                                <Card 
                                    key={agent.id}
                                    className="cursor-pointer hover:shadow-lg transition-shadow"
                                    onClick={() => handleAgentClick(agent)}
                                >
                                    <CardHeader>
                                        <div className="flex items-start gap-3">
                                            <Avatar className="w-12 h-12">
                                                <AvatarImage src={agent.picture} />
                                                <AvatarFallback>
                                                    <Bot className="w-6 h-6" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-lg truncate">
                                                    {agent.name || "Unnamed Agent"}
                                                </CardTitle>
                                                {agent.role && (
                                                    <Badge 
                                                        variant="secondary" 
                                                        className={`mt-1 ${getRoleColor(agent.role)}`}
                                                    >
                                                        {agent.role}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="line-clamp-3">
                                            {agent.description || "No description provided"}
                                        </CardDescription>
                                        {agent.useCriteria && agent.useCriteria.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {agent.useCriteria.slice(0, 3).map((criteria, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                        {criteria}
                                                    </Badge>
                                                ))}
                                                {agent.useCriteria.length > 3 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{agent.useCriteria.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}