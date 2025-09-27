import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { useProject } from "@/hooks/useProject";
import { CallView } from "@/components/call/CallView";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectAvatar } from "@/components/ui/project-avatar";

export const Route = createFileRoute("/_auth/projects/$projectId/call")({
  component: MobileCallPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      threadId: search.threadId as string | undefined,
    };
  },
});

function MobileCallPage() {
  const { projectId } = Route.useParams();
  const { threadId } = Route.useSearch();
  const navigate = useNavigate();
  const { ndk } = useNDK();
  const project = useProject(projectId);
  const [rootEvent, setRootEvent] = useState<NDKEvent | undefined>();
  const [isCallEnded, setIsCallEnded] = useState(false);

  // Load thread if threadId is provided
  useEffect(() => {
    const loadThread = async () => {
      if (threadId && ndk) {
        try {
          const thread = await ndk.fetchEvent(threadId);
          if (thread) {
            setRootEvent(thread);
          }
        } catch (error) {
          console.error("Failed to load thread for call:", error);
        }
      }
    };

    loadThread();
  }, [threadId, ndk]);

  const handleCallEnd = (newRootEvent: NDKEvent | null) => {
    setIsCallEnded(true);

    // Navigate back to the project or conversation
    if (newRootEvent) {
      // If a new conversation was created, navigate to the project with thread selected
      navigate({
        to: "/projects/$projectId",
        params: { projectId },
        search: { threadId: newRootEvent.id },
      });
    } else {
      // Otherwise just go back to the project
      navigate({
        to: "/projects/$projectId",
        params: { projectId },
      });
    }
  };

  const handleBack = () => {
    navigate({
      to: "/projects/$projectId",
      params: { projectId },
    });
  };

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <ProjectAvatar
              project={project}
              className="h-8 w-8"
              fallbackClassName="text-xs"
            />
            <div>
              <h1 className="text-sm font-semibold">
                {project.title || "Untitled Project"}
              </h1>
              <p className="text-xs text-muted-foreground">Voice Call</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call View */}
      <div className="flex-1 overflow-hidden">
        {!isCallEnded && (
          <CallView
            project={project}
            onClose={handleCallEnd}
            rootEvent={rootEvent}
            extraTags={rootEvent ? [["E", rootEvent.id]] : undefined}
          />
        )}
      </div>
    </div>
  );
}