import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useCallback } from "react";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { useProject } from "@/hooks/useProject";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DocumentationViewer } from "@/components/documentation/DocumentationViewer";
import { NDKArticle, NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { ProjectColumn } from "@/components/layout/ProjectColumn";
import { useProjectActivityStore } from "@/stores/projectActivity";
import { useAtom } from "jotai";
import { openSingleProjectAtom } from "@/stores/openProjects";
import { useIsMobile } from "@/hooks/useMediaQuery";

export const Route = createFileRoute("/_auth/projects/$projectId/")({
  component: ProjectDetailPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      threadId: search.threadId as string | undefined,
    };
  },
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { threadId } = Route.useSearch();
  const navigate = useNavigate();
  const { ndk } = useNDK();
  const project = useProject(projectId);
  const isMobile = useIsMobile();
  const [, openSingleProject] = useAtom(openSingleProjectAtom);

  // Update activity timestamp when user visits a project
  useEffect(() => {
    if (project?.dTag) {
      useProjectActivityStore.getState().updateActivity(project.dTag);
    }
  }, [project]);

  // Handle threadId from URL search params
  useEffect(() => {
    const loadThreadFromUrl = async () => {
      if (threadId && ndk && project) {
        try {
          const threadEvent = await ndk.fetchEvent(threadId);
          if (threadEvent) {
            // Clear the search param after loading
            navigate({
              to: "/projects/$projectId",
              params: { projectId },
              replace: true,
            });
            // Note: We can't directly set the thread here since ProjectColumn manages its own state
            // The thread will be handled via the ProjectColumn component
          }
        } catch (error) {
          console.error("Failed to load thread from URL:", error);
        }
      }
    };

    loadThreadFromUrl();
  }, [threadId, ndk, projectId, navigate, project]);

  // On desktop, ensure the project is marked as open (but don't redirect)
  useEffect(() => {
    if (!isMobile && project) {
      openSingleProject(project);
    }
  }, [project, isMobile, openSingleProject]);

  // Render full content callback
  const renderFullContent = useCallback(
    (
      project: any,
      itemType: string,
      item?: NDKEvent | NDKTask | NDKArticle | null,
      onBack?: () => void,
      onVoiceCallClick?: () => void,
    ) => {
      if (!project) return null;

      switch (itemType) {
        case "conversations":
          return (
            <ChatInterface
              project={project}
              rootEvent={item instanceof NDKEvent ? item : undefined}
              key={item?.id || "new"}
              className="h-full"
              onBack={onBack}
              onThreadCreated={(newThread: NDKEvent) => {
                // Thread creation is handled by ProjectColumn
              }}
              onVoiceCallClick={onVoiceCallClick}
            />
          );

        case "docs":
          if (item instanceof NDKArticle) {
            return (
              <DocumentationViewer
                article={item}
                projectTitle={project.title}
                project={project}
                onBack={onBack}
              />
            );
          }
          return null;

        default:
          return null;
      }
    },
    [],
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  // Use unified ProjectColumn for both mobile and desktop
  return (
    <ProjectColumn
      project={project}
      mode="standalone"
      renderFullContent={renderFullContent}
      className="h-full"
      viewMode={isMobile ? "mobile" : "desktop"}
    />
  );
}