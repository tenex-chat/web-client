import { type NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bot, Settings, Copy, CheckCircle2 } from "lucide-react";
import { EVENT_KINDS } from "../../lib/constants";
import { NDKAgent } from "../../lib/ndk-events/NDKAgent";
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { EmptyState } from "../common/EmptyState";

// This component shows an NDKAgent definition (the "class" not the instance)
export function AgentDetailPage() {
    const { agentId } = useParams({ from: '/agents/$agentId' });
    const { ndk } = useNDK();
    const user = useNDKCurrentUser();
    const navigate = useNavigate();
    const [copiedId, setCopiedId] = useState(false);

    // Fetch the agent event by ID
    const { events: agentEvents } = useSubscribe(
        [{ 
            kinds: [EVENT_KINDS.AGENT_CONFIG as NDKKind], 
            ids: [agentId],
            limit: 1
        }],
        {},
        [agentId]
    );

    const agent = useMemo(
        () => agentEvents?.[0] ? new NDKAgent(ndk || undefined, agentEvents[0].rawEvent()) : null,
        [agentEvents, ndk]
    );

    const handleBack = () => {
        navigate({ to: '/agents' });
    };

    const handleEdit = () => {
        // Edit functionality not yet implemented
    };

    const handleCopyId = async () => {
        if (!agent) return;
        try {
            await navigator.clipboard.writeText(agent.id);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        } catch (error) {
            console.error("Failed to copy ID:", error);
        }
    };

    const isOwner = user && agent && user.pubkey === agent.pubkey;

    if (!agent) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <EmptyState
                    icon={<Bot className="w-12 h-12" />}
                    title="Agent not found"
                    description="This agent definition could not be found."
                    action={{
                        label: "Back to Agents",
                        onClick: handleBack
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-card border-b border-border">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleBack}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <Avatar className="w-16 h-16">
                            <AvatarImage src={agent.picture} />
                            <AvatarFallback>
                                <Bot className="w-8 h-8" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h1 className="text-2xl font-semibold">
                                {agent.name || "Unnamed Agent"}
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                {agent.role && (
                                    <Badge variant="secondary">
                                        {agent.role}
                                    </Badge>
                                )}
                                <button
                                    onClick={handleCopyId}
                                    className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1"
                                >
                                    {agent.id.slice(0, 8)}...{agent.id.slice(-8)}
                                    {copiedId ? (
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </button>
                            </div>
                        </div>
                        {isOwner && (
                            <Button onClick={handleEdit}>
                                <Settings className="w-4 h-4 mr-2" />
                                Edit Definition
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="max-w-4xl mx-auto p-4 space-y-4">
                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                {agent.description || "No description provided"}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    {agent.instructions && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Instructions</CardTitle>
                                <CardDescription>
                                    The prompt that defines this agent's behavior
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">
                                    {agent.instructions}
                                </pre>
                            </CardContent>
                        </Card>
                    )}

                    {/* Use Criteria */}
                    {agent.useCriteria && agent.useCriteria.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Use Criteria</CardTitle>
                                <CardDescription>
                                    When this agent should be used
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {agent.useCriteria.map((criteria, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-muted-foreground">•</span>
                                            <span>{criteria}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Author:</span>
                                <span className="font-mono">{agent.pubkey.slice(0, 16)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created:</span>
                                <span>{new Date((agent.created_at || 0) * 1000).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Event Kind:</span>
                                <span>{agent.kind}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
}