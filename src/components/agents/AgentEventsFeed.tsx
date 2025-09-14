import { type NDKKind, type NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { Activity } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/time";
import { Badge } from "@/components/ui/badge";
import { Message } from "@/components/chat/Message";
import { MessageThread } from "@/components/chat/MessageThread";
import { TaskContent } from "@/components/chat/TaskContent";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { MessageShell } from "@/components/chat/MessageShell";
import { NDKAgentLesson } from "@/lib/ndk-events/NDKAgentLesson";
import { LessonCard } from "./LessonCard";
import { useNavigate } from "@tanstack/react-router";

interface AgentEventsFeedProps {
  pubkey: string;
}

const EVENT_KIND_NAMES: Record<number, string> = {
  1: "Note",
  4128: "Agent Definition",
  4129: "Lesson",
  9905: "Job Request",
  9906: "Job Accepted",
  9907: "Job Status",
  9908: "Job Feedback",
  30078: "Application Specific Data",
  31337: "Audio",
  1111: "Generic Reply",
};

export function AgentEventsFeed({ pubkey }: AgentEventsFeedProps) {
  const navigate = useNavigate();

  // Subscribe to all events from this agent pubkey
  const { events } = useSubscribe(
    [
      {
        authors: [pubkey],
        limit: 50,
      },
    ],
    {},
    [pubkey],
  );

  const sortedEvents = useMemo(() => {
    return [...events]
      .filter((event) => {
        const kind = event.kind as number;
        // Filter out ephemeral events (kinds 20000-29999)
        if (kind >= 20000 && kind <= 29999) return false;
        // Filter out operations status (24133) and stop request (24134) events
        if (kind === 24133 || kind === 24134) return false;
        return true;
      })
      .sort((a, b) => {
        const aTime = a.created_at || 0;
        const bTime = b.created_at || 0;
        return bTime - aTime;
      });
  }, [events]);

  const getEventKindName = (kind: NDKKind | undefined) => {
    if (!kind) return "Unknown";
    return EVENT_KIND_NAMES[kind as number] || `Kind ${kind}`;
  };

  const getEventPreview = (event: NDKEvent) => {
    try {
      const content = event.content;
      if (!content) return "No content";

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(content);
        if (parsed.content) return parsed.content;
        if (parsed.text) return parsed.text;
        if (parsed.message) return parsed.message;
        if (parsed.description) return parsed.description;
        if (parsed.title) return parsed.title;
        if (parsed.name) return parsed.name;
        // Return first string value found
        for (const value of Object.values(parsed)) {
          if (typeof value === "string" && value.trim()) {
            return value;
          }
        }
      } catch {
        // Not JSON, return as is
      }

      return content;
    } catch {
      return "Unable to parse content";
    }
  };

  // Handle conversation navigation - find the project from the event tags
  const handleConversationNavigate = useCallback(
    (event: NDKEvent) => {
      // Find project tag (d-tag) from the event
      const projectTag = event.tags?.find((tag) => tag[0] === "d" && tag[1]);
      if (projectTag && projectTag[1]) {
        // Navigate to the project conversation with this event selected
        navigate({
          to: "/projects/$projectId",
          params: { projectId: projectTag[1] },
          search: { threadId: event.id },
        });
      }
    },
    [navigate],
  );

  if (sortedEvents.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="w-12 h-12" />}
        title="No events yet"
        description="This agent hasn't published any events."
      />
    );
  }

  const renderEvent = (event: NDKEvent) => {
    const kind = event.kind as number;

    // Use chat message component for Generic Reply (kind 1111)
    if (kind === 1111) {
      return (
        <div key={event.id}>
          <Message
            event={event}
            project={null}
            onConversationNavigate={handleConversationNavigate}
          />
          <MessageThread
            parentEvent={event}
            project={null}
            onConversationNavigate={handleConversationNavigate}
          />
        </div>
      );
    }

    // Use LessonCard for lesson events (kind 4129)
    if (kind === 4129) {
      const lesson = NDKAgentLesson.from(event);
      return <LessonCard key={event.id} lesson={lesson} compact={true} />;
    }

    // Use TaskContent for task events
    if (kind === 9905 || kind === 9906 || kind === 9907 || kind === 9908) {
      const task = NDKTask.from(event);
      if (task) {
        return (
          <MessageShell key={event.id} event={event} project={null}>
            <TaskContent task={task} />
          </MessageShell>
        );
      }
    }

    // Default card rendering for other events
    return (
      <Card
        key={event.id}
        className="hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => handleConversationNavigate(event)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{getEventKindName(event.kind)}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(event.created_at || 0)}
              </span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {event.id?.slice(0, 8)}...
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {getEventPreview(event)}
          </p>
          {event.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {event.tags.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-muted px-2 py-0.5 rounded"
                >
                  {tag[0]}
                  {tag[1]
                    ? `: ${tag[1].slice(0, 20)}${tag[1].length > 20 ? "..." : ""}`
                    : ""}
                </span>
              ))}
              {event.tags.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{event.tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3">{sortedEvents.map(renderEvent)}</div>
    </ScrollArea>
  );
}
