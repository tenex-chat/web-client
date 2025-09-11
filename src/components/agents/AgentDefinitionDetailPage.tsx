import { useEvent, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { TIMING } from "@/lib/constants";
import {
  ArrowLeft,
  Bot,
  GitFork,
  Copy,
  CheckCircle2,
  Info,
  Users,
  Wrench,
  Server,
  Layers,
} from "lucide-react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { CreateAgentDialog } from "@/components/dialogs/CreateAgentDialog";
import ReactMarkdown from "react-markdown";
import { generateAgentColor } from "@/lib/utils/agent-colors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentInstances } from "./AgentInstances";
import { NDKMCPTool } from "@/lib/ndk-events/NDKMCPTool";
import type { NDKKind } from "@nostr-dev-kit/ndk-hooks";

// This component shows an NDKAgentDefinition definition (the "class" not the instance)
export function AgentDefinitionDetailPage() {
  const { agentDefinitionEventId } = useParams({
    from: "/_auth/agent-definition/$agentDefinitionEventId",
  });
  useNDKCurrentUser();
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(false);
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Fetch the agent event by ID
  const agentEvent = useEvent(agentDefinitionEventId);
  const agent = useMemo(
    () => agentEvent && NDKAgentDefinition.from(agentEvent),
    [agentEvent],
  );

  // Fetch MCP servers linked to this agent
  const mcpEventIds = agent?.mcpServers || [];
  const { events: mcpEvents } = useSubscribe(
    mcpEventIds.length > 0
      ? [{ ids: mcpEventIds, kinds: [4200 as NDKKind] }]
      : [],
    { closeOnEose: true }
  );

  const mcpTools = useMemo(() => {
    if (!mcpEvents || mcpEvents.length === 0) return [];
    return mcpEvents.map(event => NDKMCPTool.from(event));
  }, [mcpEvents]);

  const handleBack = () => {
    navigate({ to: "/agents" });
  };

  const handleFork = () => {
    setForkDialogOpen(true);
  };

  const agentColor = agent ? generateAgentColor(agent.name || agent.id) : "";

  const handleCopyId = async () => {
    if (!agent) return;
    try {
      await navigator.clipboard.writeText(agent.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), TIMING.COPY_FEEDBACK_DURATION);
    } catch (error) {
      console.error("Failed to copy ID:", error);
    }
  };

  // Remove isOwner check - forking is allowed for everyone

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<Bot className="w-12 h-12" />}
          title="Agent definition not found"
          description="This agent definition could not be found."
          action={{
            label: "Back to Agent Definitions",
            onClick: handleBack,
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
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="w-16 h-16">
              <AvatarImage src={agent.picture} />
              <AvatarFallback style={{ backgroundColor: agentColor }}>
                <Bot className="w-8 h-8 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">
                {agent.name || "Unnamed Agent Definition"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {agent.role && <Badge variant="secondary">{agent.role}</Badge>}
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
            <Button onClick={handleFork}>
              <GitFork className="w-4 h-4 mr-2" />
              Fork
            </Button>
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <div className="flex-1 flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <div className="border-b border-border">
            <div className="max-w-4xl mx-auto px-4">
              <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="details"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="instances"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Agent Instances
                </TabsTrigger>
                {agent.phases && agent.phases.length > 0 && (
                  <TabsTrigger
                    value="phases"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Phases ({agent.phases.length})
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>

          <TabsContent value="details" className="flex-1 mt-0">
            <ScrollArea className="h-full">
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
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{agent.instructions}</ReactMarkdown>
                      </div>
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

                {/* Tools & MCP Servers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tools & Capabilities</CardTitle>
                    <CardDescription>
                      Available tools and MCP server integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Direct Tools */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Direct Tools</span>
                      </div>
                      {agent.tools.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {agent.tools.map((tool, idx) => (
                            <Badge key={idx} variant="outline">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No direct tools configured</p>
                      )}
                    </div>

                    {/* MCP Servers */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">MCP Servers</span>
                      </div>
                      {mcpTools.length > 0 ? (
                        <div className="space-y-2">
                          {mcpTools.map((mcp) => (
                            <div
                              key={mcp.id}
                              className="border border-border rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">
                                    {mcp.name || "Unnamed MCP Server"}
                                  </h4>
                                  {mcp.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {mcp.description}
                                    </p>
                                  )}
                                  {mcp.command && (
                                    <code className="text-xs bg-muted px-2 py-0.5 rounded mt-2 inline-block">
                                      {mcp.command}
                                    </code>
                                  )}
                                </div>
                              </div>
                              {mcp.capabilities.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    Capabilities:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {mcp.capabilities.map((cap, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs py-0 h-5"
                                      >
                                        {cap}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No MCP servers configured</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle>Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Author:</span>
                      <span className="font-mono">
                        {agent.pubkey.slice(0, 16)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>
                        {new Date(
                          (agent.created_at || 0) * 1000,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Event Kind:</span>
                      <span>{agent.kind}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="phases" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto p-4">
                {agent.phases && agent.phases.length > 0 ? (
                  <div className="space-y-4">
                    {agent.phases.map((phase, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Phase {index + 1}
                            </Badge>
                            {phase.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{phase.instructions}</ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Layers className="w-12 h-12" />}
                    title="No phases defined"
                    description="This agent does not have any phase definitions."
                  />
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="instances" className="flex-1 mt-0">
            <AgentInstances agentDefinitionId={agent.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Fork Dialog */}
      <CreateAgentDialog
        open={forkDialogOpen}
        onOpenChange={setForkDialogOpen}
        forkFromAgent={agent}
      />
    </div>
  );
}
