import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_auth/chat/$eventId")({
  component: ChatEventPage,
});

function ChatEventPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { ndk } = useNDK();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<NDKEvent | null>(null);
  const [project, setProject] = useState<NDKProject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEventAndProject = async () => {
      if (!ndk || !eventId) return;

      setLoading(true);
      setError(null);

      try {
        // Decode the event ID if it's a nevent/note format
        let actualEventId = eventId;
        if (eventId.startsWith("nevent") || eventId.startsWith("note")) {
          // The NDK should handle decoding this
          const decoded = ndk.decode(eventId);
          if (decoded && typeof decoded === "object" && "id" in decoded) {
            actualEventId = decoded.id as string;
          }
        }

        // Fetch the event
        const fetchedEvent = await ndk.fetchEvent(actualEventId);
        if (!fetchedEvent) {
          setError("Event not found");
          setLoading(false);
          return;
        }

        setEvent(fetchedEvent);

        // Find the project from the event's a-tag
        const projectTag = fetchedEvent.tags?.find((tag) => tag[0] === "a" && tag[1]);
        if (projectTag && projectTag[1]) {
          // The a-tag contains an event coordinate in the format kind:pubkey:d-tag
          const coordinate = projectTag[1];
          const parts = coordinate.split(":");

          if (parts.length >= 3) {
            const [kind, pubkey, ...dTagParts] = parts;
            const dTag = dTagParts.join(":"); // Handle d-tags that might contain colons

            // Try to fetch the actual project event
            const projectEvents = await ndk.fetchEvents({
              kinds: [30078 as any], // NDKProject kind
              authors: [pubkey],
              "#d": [dTag],
            });

            if (projectEvents && projectEvents.size > 0) {
              const projectEvent = Array.from(projectEvents)[0];
              const projectObj = NDKProject.from(projectEvent);
              setProject(projectObj);
            } else {
              // Create a temporary project object if we can't find the actual one
              const tempProject = new NDKProject(ndk);
              tempProject.tags.push(["d", dTag]);
              tempProject.title = dTag; // Use d-tag as title fallback
              setProject(tempProject);
            }
          }
        } else {
          // No project tag found, create a minimal project
          const tempProject = new NDKProject(ndk);
          tempProject.tags.push(["d", "standalone"]);
          tempProject.title = "Standalone Conversation";
          setProject(tempProject);
        }
      } catch (err) {
        console.error("Error loading event:", err);
        setError("Failed to load conversation");
      } finally {
        setLoading(false);
      }
    };

    loadEventAndProject();
  }, [eventId, ndk]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">{error || "Failed to load conversation"}</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate({ to: "/projects" });
  };

  return (
    <div className="flex flex-col h-full">
      <ChatInterface
        project={project}
        rootEvent={event}
        className="h-full"
        onBack={handleBack}
      />
    </div>
  );
}