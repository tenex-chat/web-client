import { type NDKKind } from "@nostr-dev-kit/ndk-hooks";
import {
  useNDK,
  useSubscribe,
  useProfileValue,
} from "@nostr-dev-kit/ndk-hooks";
import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bot, BookOpen, Copy, CheckCircle2, Sparkles } from "lucide-react";
import { TIMING } from "@/lib/constants";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { NDKAgentLesson } from "@/lib/ndk-events/NDKAgentLesson";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { AgentSettingsTab } from "./AgentSettingsTab";
import { AgentEventsFeed } from "./AgentEventsFeed";
import { LessonCard } from "./LessonCard";
import { parseAgentMetadata, getUserMetadataEvent, hasAgentMetadata } from "@/utils/parseAgentMetadata";
import { CreateAgentDialog } from "@/components/dialogs/CreateAgentDialog";
// Dialog components removed - using route navigation instead

type TabType = "feed" | "details" | "lessons" | "settings";

interface AgentProfilePageProps {
  pubkey?: string;
}

export function AgentProfilePage({
  pubkey: propPubkey,
}: AgentProfilePageProps = {}) {
  // Try to get params, but handle the case where we're not in a route context
  let routePubkey: string | undefined;
  try {
    const params = useParams({ strict: false });
    routePubkey = params?.pubkey;
  } catch {
    // Not in a route context, that's okay
  }
  const pubkey = propPubkey || routePubkey;
  const { ndk } = useNDK();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [copiedPubkey, setCopiedPubkey] = useState(false);
  const [metadataEvent, setMetadataEvent] = useState<any>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertData, setConvertData] = useState<any>(null);
  // Dialog state removed - using route navigation instead

  // The agent IS the pubkey - get their profile
  // Must call all hooks before any conditional returns
  const profile = useProfileValue(pubkey);

  // The pubkey parameter is the agent's pubkey (not the author of an NDKAgentDefinition event)
  // For agent profiles, we may not have an NDKAgentDefinition event - the agent might just be in status events
  const { events: agentEvents } = useSubscribe(
    pubkey
      ? [
          {
            kinds: [NDKAgentDefinition.kind as NDKKind],
            authors: [pubkey],
            limit: 1,
          },
        ]
      : false,
    {},
    [pubkey],
  );

  const agent = useMemo(
    () =>
      agentEvents?.[0]
        ? new NDKAgentDefinition(ndk || undefined, agentEvents[0].rawEvent())
        : null,
    [agentEvents, ndk],
  );

  // Fetch lessons for this agent (kind 4129)
  // Lessons reference the agent by pubkey in a p-tag
  const { events } = useSubscribe<NDKAgentLesson>(
    pubkey
      ? [
          {
            kinds: [NDKAgentLesson.kind as NDKKind],
            authors: [pubkey],
          },
        ]
      : false,
    { wrap: true },
    [pubkey],
  );
  const lessons = useMemo(
    () => events.map((e) => NDKAgentLesson.from(e)),
    [events],
  );

  // Fetch kind:0 metadata event
  useEffect(() => {
    if (!pubkey || !ndk) return;
    
    getUserMetadataEvent(ndk, pubkey).then(event => {
      setMetadataEvent(event);
    });
  }, [pubkey, ndk]);

  // Parse agent metadata from kind:0 event
  const agentMetadata = useMemo(
    () => parseAgentMetadata(metadataEvent),
    [metadataEvent]
  );

  // Check if kind:0 has agent metadata but no NDKAgentDefinition exists
  const showConversionButton = useMemo(
    () => !agent && hasAgentMetadata(metadataEvent),
    [agent, metadataEvent]
  );

  // Early return if no pubkey is available - after all hooks
  if (!pubkey) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No agent pubkey provided</p>
      </div>
    );
  }

  const handleBack = () => {
    // Check if we came from a project page by looking at the history
    // If we can't determine, go back to the agents list
    if (window.history.length > 1) {
      navigate({ to: ".." });
    } else {
      navigate({ to: "/agents" });
    }
  };

  const handleCopyPubkey = async () => {
    if (!pubkey) return;
    try {
      await navigator.clipboard.writeText(pubkey);
      setCopiedPubkey(true);
      setTimeout(() => setCopiedPubkey(false), TIMING.COPY_FEEDBACK_DURATION);
    } catch (error) {
      console.error("Failed to copy pubkey:", error);
    }
  };

  const handleLessonClick = (lesson: NDKAgentLesson) => {
    // Navigate to the lesson view page
    navigate({
      to: "/lesson/$lessonId",
      params: {
        lessonId: lesson.id,
      },
    });
  };

  // Comment handling moved to LessonView component

  // Comments are fetched in the LessonView component

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
              <AvatarImage src={profile?.image} />
              <AvatarFallback>
                <Bot className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">
                {profile?.name || profile?.displayName || "Agent"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {agent?.role && <Badge variant="secondary">{agent.role}</Badge>}
                <button
                  onClick={handleCopyPubkey}
                  className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1"
                >
                  {pubkey.slice(0, 8)}...{pubkey.slice(-8)}
                  {copiedPubkey ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            {showConversionButton && (
              <Button
                onClick={() => {
                  if (agentMetadata) {
                    setConvertData({
                      name: agentMetadata.name || profile?.name || profile?.displayName || "Agent",
                      description: agentMetadata.about || "",
                      role: agentMetadata.role || "assistant",
                      instructions: agentMetadata.instructions || agentMetadata.systemPrompt || "",
                      useCriteria: agentMetadata.useCriteria || [],
                      picture: agentMetadata.picture || agentMetadata.image,
                    });
                    setConvertDialogOpen(true);
                  }
                }}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Sparkles className="w-4 h-4" />
                Convert to Agent Definition
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabType)}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="lessons">
                Lessons {lessons.length > 0 && `(${lessons.length})`}
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="feed" className="space-y-4">
              <AgentEventsFeed pubkey={pubkey} />
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {/* Show metadata warning if only kind:0 exists */}
              {!agent && agentMetadata && (
                <Card className="border-orange-500/50 bg-orange-50/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-orange-500" />
                      Agent Metadata from Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      This agent has metadata stored in their Nostr profile (kind:0 event).
                      Convert it to an Agent Definition for better structure and compatibility.
                    </p>
                    <Button
                      onClick={() => {
                        if (agentMetadata) {
                          setConvertData({
                            name: agentMetadata.name || profile?.name || profile?.displayName || "Agent",
                            description: agentMetadata.about || "",
                            role: agentMetadata.role || "assistant",
                            instructions: agentMetadata.instructions || agentMetadata.systemPrompt || "",
                            useCriteria: agentMetadata.useCriteria || [],
                            picture: agentMetadata.picture || agentMetadata.image,
                          });
                          setConvertDialogOpen(true);
                        }
                      }}
                      className="w-full"
                      variant="default"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Convert to Agent Definition
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {agent?.description || agentMetadata?.about || "No description provided"}
                  </p>
                </CardContent>
              </Card>

              {(agent?.instructions || agentMetadata?.instructions || agentMetadata?.systemPrompt) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Instructions / System Prompt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm">
                      {agent?.instructions || agentMetadata?.instructions || agentMetadata?.systemPrompt}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {((agent?.useCriteria && agent.useCriteria.length > 0) || 
                (agentMetadata?.useCriteria && agentMetadata.useCriteria.length > 0)) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Use Criteria</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      When this agent should be used
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(agent?.useCriteria || agentMetadata?.useCriteria)?.map((criteria, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{criteria}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="lessons" className="space-y-4">
              {lessons.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="w-12 h-12" />}
                  title="No lessons yet"
                  description="This agent hasn't learned any lessons yet."
                />
              ) : (
                lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onClick={() => handleLessonClick(lesson)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <AgentSettingsTab agent={agent || undefined} agentSlug={pubkey} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Convert to Agent Definition Dialog */}
      {convertData && (
        <CreateAgentDialog
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          fromKind0Metadata={convertData}
          conversionMode={true}
        />
      )}
    </div>
  );
}
