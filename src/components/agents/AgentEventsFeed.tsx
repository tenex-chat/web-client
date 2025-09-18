import { type NDKKind, type NDKEvent, useSubscribe, useNDK } from "@nostr-dev-kit/ndk-hooks";
import { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { Activity } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/time";
import { Badge } from "@/components/ui/badge";
import { ThreadedMessage } from "@/components/chat/ThreadedMessage";
import { TaskContent } from "@/components/chat/TaskContent";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { MessageShell } from "@/components/chat/MessageShell";
import { NDKAgentLesson } from "@/lib/ndk-events/NDKAgentLesson";
import { LessonCard } from "./LessonCard";
import { useNavigate } from "@tanstack/react-router";
import { useWindowManager } from "@/stores/windowManager";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { ArticleEmbedCard } from "@/components/embeds/ArticleEmbedCard";

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
  30023: "Long-form Article",
};

export function AgentEventsFeed({ pubkey }: AgentEventsFeedProps) {
  const navigate = useNavigate();
  const { ndk } = useNDK();
  const { addWindow, canAddWindow } = useWindowManager();

  // Subscribe to all projects to create a map of project coordinates
  const { events: projectEvents } = useSubscribe(
    [
      {
        kinds: [30078 as any], // NDKProject kind
      },
    ],
    {},
    [],
  );

  // Create a map of event coordinates (kind:pubkey:d-tag) to project
  const projectsMap = useMemo(() => {
    const map = new Map<string, NDKProject>();
    if (ndk) {
      projectEvents.forEach((event) => {
        const project = NDKProject.from(event);
        // Create the event coordinate in the format kind:pubkey:d-tag
        const coordinate = `${event.kind}:${event.pubkey}:${project.dTag}`;
        if (project.dTag) {
          map.set(coordinate, project);
        }
      });
    }
    return map;
  }, [projectEvents, ndk]);

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

  // Handle time click - open chat interface with this event as the conversation
  const handleTimeClick = useCallback(
    (event: NDKEvent) => {
      console.log("handleTimeClick called in AgentEventsFeed!");
      console.log("Event:", event);

      // Check if we're in the /projects route where WindowManager is actually mounted
      const isInProjectsRoute = window.location.pathname.includes('/projects');
      console.log("Is in projects route?", isInProjectsRoute);

      // Only try to open floating window if we're in the projects route
      if (isInProjectsRoute && canAddWindow && canAddWindow()) {
        try {
          // Find project tag (a-tag) from the event
          const projectTag = event.tags?.find((tag) => tag[0] === "a" && tag[1]);
          if (projectTag && projectTag[1] && ndk) {
            // The a-tag contains an event coordinate in the format kind:pubkey:d-tag
            const coordinate = projectTag[1];

            // Try to get the actual project from our map
            let project = projectsMap.get(coordinate);
            if (!project) {
              // Parse the coordinate to extract d-tag
              const parts = coordinate.split(":");
              if (parts.length >= 3) {
                const dTag = parts.slice(2).join(":"); // Handle d-tags that might contain colons

                // Create a temporary project object with the d-tag
                project = new NDKProject(ndk);
                project.tags.push(["d", dTag]);
                project.title = dTag; // Use d-tag as title fallback
              } else {
                // Invalid coordinate format, but continue to navigation fallback
                console.warn("Invalid project coordinate format:", coordinate);
              }
            }

            if (project) {
              // Open the chat interface in a floating window with this event as the root
              console.log("Opening in floating window");
              addWindow({
                project,
                type: "conversations",
                item: event,
                data: { id: event.id, event },
              });
              return; // Successfully opened in floating window
            }
          }
        } catch (error) {
          console.log("Error opening floating window:", error);
        }
      }

      // Fallback: Navigate to the dedicated chat route
      // This is used when:
      // 1. We're not in the /projects route (e.g., on /p/<pubkey>)
      // 2. Window manager can't add more windows
      // 3. There was an error opening the floating window
      console.log("Navigating to chat route with event ID:", event.id);
      navigate({
        to: "/chat/$eventId",
        params: { eventId: event.id },
      });
    },
    [addWindow, canAddWindow, navigate, ndk, projectsMap],
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
          <ThreadedMessage
            message={{ id: event.id, event }}
            depth={0}
            project={null}
            onTimeClick={handleTimeClick}
            onConversationNavigate={handleConversationNavigate}
          />
        </div>
      );
    }

    // Use ArticleEmbedCard for long-form article events (kind 30023)
    if (kind === 30023) {
      return (
        <ArticleEmbedCard
          key={event.id}
          event={event}
          onClick={() => handleConversationNavigate(event)}
        />
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
