import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ProjectColumn } from "./ProjectColumn";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DocumentationViewer } from "@/components/documentation/DocumentationViewer";
import { DocumentationEditorDrawer } from "@/components/documentation/DocumentationEditorDrawer";
import { AgentProfilePage } from "@/components/agents/AgentProfilePage";
import { ProjectGeneralSettings } from "@/components/settings/ProjectGeneralSettings";
import { ProjectAgentsSettings } from "@/components/settings/ProjectAgentsSettings";
import { ProjectToolsSettings } from "@/components/settings/ProjectToolsSettings";
import { ProjectAdvancedSettings } from "@/components/settings/ProjectAdvancedSettings";
import { ProjectDangerZone } from "@/components/settings/ProjectDangerZone";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent, NDKArticle, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CallView } from "@/components/call/CallView";
import { WindowManager } from "@/components/windows/WindowManager";
import { useWindowManager } from "@/stores/windowManager";
import { useIsMobile, useIsDesktop } from "@/hooks/useMediaQuery";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  DrawerContent,
  TabType,
} from "@/components/windows/FloatingWindow";

interface MultiProjectViewProps {
  openProjects: NDKProject[];
  className?: string;
}

export function MultiProjectView({
  openProjects,
  className,
}: MultiProjectViewProps) {
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(
    null,
  );
  const [selectedThreadEvent, setSelectedThreadEvent] = useState<
    NDKEvent | undefined
  >();
  const [selectedArticle, setSelectedArticle] = useState<NDKArticle | null>(
    null,
  );
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NDKArticle | null>(null);
  const [showCallView, setShowCallView] = useState(false);
  const [callViewProject, setCallViewProject] = useState<NDKProject | null>(
    null,
  );

  const { addWindow, canAddWindow, windows } = useWindowManager();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  // Collect existing hashtags from documentation for suggestions
  const currentProject = drawerContent?.project;

  const { events: articles } = useSubscribe<NDKArticle>(
    currentProject
      ? [
          {
            kinds: [NDKKind.Article],
            "#a": [currentProject.tagId()],
          },
        ]
      : false,
    {
      wrap: true,
      closeOnEose: false,
      groupable: true,
      subId: "hashtag-suggestions",
    },
  );

  const existingHashtags = useMemo(() => {
    if (!articles) return [];
    const tagSet = new Set<string>();
    articles.forEach((article) => {
      article.tags
        .filter((tag) => tag[0] === "t")
        .forEach((tag) => tagSet.add(tag[1]));
    });
    return Array.from(tagSet).sort();
  }, [articles]);

  // Handle item clicks from project columns
  const handleItemClick = async (
    project: NDKProject,
    itemType: TabType,
    item?: string | NDKEvent,
  ) => {
    // If we have detached windows and we're on desktop, prefer opening in detached window
    const hasDetachedWindows = windows.size > 0;
    const shouldUseDetachedWindow =
      !isMobile && hasDetachedWindows && canAddWindow();

    // Create content object
    const content: DrawerContent = { project, type: itemType, item };

    // Add data for conversations
    if (itemType === "conversations" && item instanceof NDKEvent) {
      content.data = item;
    }

    if (shouldUseDetachedWindow) {
      // Open in detached window
      if (itemType === "conversations" && item === "new") {
        setSelectedThreadEvent(undefined);
        addWindow({ ...content, item: "new" });
      } else if (itemType === "conversations" && item instanceof NDKEvent) {
        addWindow({ ...content, data: item });
      } else if (itemType === "docs" && item === "new") {
        addWindow({ ...content, item: "new" });
      } else if (itemType === "docs" && item instanceof NDKEvent) {
        addWindow(content);
      } else {
        addWindow(content);
      }
    } else {
      // Open in drawer (original behavior)
      if (itemType === "conversations" && item === "new") {
        // New conversation
        setSelectedThreadEvent(undefined);
        setDrawerContent({ project, type: itemType, item: "new" });
      } else if (itemType === "conversations" && item) {
        // Existing conversation
        const threadEvent = item;
        if (threadEvent instanceof NDKEvent) {
          setSelectedThreadEvent(threadEvent);
          setDrawerContent({
            project,
            type: itemType,
            item,
            data: threadEvent,
          });
        }
      } else if (itemType === "docs" && item === "new") {
        // New documentation - open in drawer
        setIsCreatingDoc(true);
        setEditingArticle(null);
        setSelectedArticle(null);
        setDrawerContent({ project, type: itemType, item: "new" });
      } else if (itemType === "docs" && item instanceof NDKEvent) {
        // Existing documentation
        setIsCreatingDoc(false);
        setEditingArticle(null);
        setDrawerContent({ project, type: itemType, item });
        setSelectedArticle(NDKArticle.from(item));
      } else {
        setDrawerContent({ project, type: itemType, item });
      }
    }
  };

  const handleDrawerClose = () => {
    setDrawerContent(null);
    setSelectedThreadEvent(undefined);
    setSelectedArticle(null);
    setIsCreatingDoc(false);
    setEditingArticle(null);
  };

  const handleDetachWindow = () => {
    if (!drawerContent || isMobile) return;

    // Create a deep copy of the drawer content to make it independent
    const contentForWindow: DrawerContent = {
      project: drawerContent.project, // NDKProject is immutable, safe to share reference
      type: drawerContent.type,
      item: drawerContent.item,
      data: selectedThreadEvent || drawerContent.data,
    };

    // Add to floating windows
    const windowId = addWindow(contentForWindow);

    if (windowId) {
      // Close the drawer after successful detachment
      handleDrawerClose();
    }
  };

  const handleAttachWindow = (content: DrawerContent) => {
    // Set up the drawer content based on the attached window content
    if (content.type === "conversations") {
      if (content.item === "new") {
        setSelectedThreadEvent(undefined);
        setDrawerContent({
          project: content.project,
          type: content.type,
          item: "new",
        });
      } else if (content.data) {
        setSelectedThreadEvent(content.data);
        setDrawerContent({
          project: content.project,
          type: content.type,
          item: content.item,
          data: content.data,
        });
      }
    } else if (content.type === "docs") {
      if (content.item === "new") {
        setIsCreatingDoc(true);
        setEditingArticle(null);
        setSelectedArticle(null);
        setDrawerContent({
          project: content.project,
          type: content.type,
          item: "new",
        });
      } else if (content.item instanceof NDKEvent) {
        setIsCreatingDoc(false);
        setEditingArticle(null);
        setDrawerContent({
          project: content.project,
          type: content.type,
          item: content.item,
        });
        setSelectedArticle(NDKArticle.from(content.item));
      }
    } else {
      setDrawerContent(content);
    }
  };

  const renderDrawerContent = () => {
    if (!drawerContent) return null;

    const { project, type } = drawerContent;

    switch (type) {
      case "conversations":
        return (
          <ChatInterface
            project={project}
            rootEvent={selectedThreadEvent}
            className="h-full"
            onBack={handleDrawerClose}
            onDetach={
              !isMobile && canAddWindow() ? handleDetachWindow : undefined
            }
            onTaskClick={(task: NDKTask) => {
              if (task) {
                setSelectedThreadEvent(task);
                setDrawerContent({ ...drawerContent, data: task });
              }
            }}
            onThreadCreated={(newThread: NDKEvent) => {
              if (newThread) {
                setSelectedThreadEvent(newThread);
                setDrawerContent({
                  ...drawerContent,
                  data: newThread,
                  item: newThread.id,
                });
              }
            }}
            onVoiceCallClick={() => {
              // On desktop, open in floating window; on mobile/tablet, use fullscreen overlay
              if (isDesktop) {
                const callContent: DrawerContent = {
                  project,
                  type: "call",
                  data: {
                    onCallEnd: (rootEvent?: NDKEvent | null) => {
                      // If a conversation was created during the call, open it in the drawer
                      if (rootEvent) {
                        setSelectedThreadEvent(rootEvent);
                        setDrawerContent({
                          project,
                          type: "conversations",
                          data: rootEvent,
                          item: rootEvent.id,
                        });
                      }
                    },
                  },
                };

                if (canAddWindow()) {
                  addWindow(callContent);
                } else {
                  // If we can't add more windows, use fullscreen overlay as fallback
                  setCallViewProject(project);
                  setShowCallView(true);
                }
              } else {
                // Mobile/tablet: use fullscreen overlay
                setCallViewProject(project);
                setShowCallView(true);
              }
            }}
          />
        );

      case "docs":
        // Creating new document or editing
        if (isCreatingDoc || editingArticle) {
          return (
            <DocumentationEditorDrawer
              project={project}
              projectTitle={project.title}
              existingArticle={editingArticle}
              existingHashtags={existingHashtags}
              onBack={handleDrawerClose}
              onDetach={
                !isMobile && canAddWindow() ? handleDetachWindow : undefined
              }
            />
          );
        }
        // Viewing existing document
        if (selectedArticle) {
          return (
            <DocumentationViewer
              article={selectedArticle}
              projectTitle={project.title}
              project={project}
              onBack={handleDrawerClose}
              onDetach={
                !isMobile && canAddWindow() ? handleDetachWindow : undefined
              }
              onEdit={() => {
                setEditingArticle(selectedArticle);
                setIsCreatingDoc(false);
              }}
            />
          );
        }
        return <div className="p-4">Loading document...</div>;

      case "agents":
        // The item should be the agent's pubkey
        if (typeof drawerContent.item === "string") {
          return (
            <div className="h-full flex flex-col">
              {/* Agent Profile Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDrawerClose}
                    className="h-9 w-9"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h2 className="text-lg font-semibold">Agent Profile</h2>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isMobile && canAddWindow() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDetachWindow}
                      className="h-9 w-9"
                      title="Detach to floating window"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDrawerClose}
                    className="h-9 w-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Agent Profile Content */}
              <div className="flex-1 overflow-hidden">
                <AgentProfilePage pubkey={drawerContent.item} />
              </div>
            </div>
          );
        }
        return null;

      case "status":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Project Status</h2>
            <p className="text-muted-foreground">
              Detailed status view would go here
            </p>
          </div>
        );

      case "settings":
        // Render appropriate settings component based on item
        return (
          <div className="h-full flex flex-col">
            {/* Settings Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDrawerClose}
                  className="h-9 w-9"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">
                    {project.title} Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {drawerContent.item === "agents"
                      ? "Agent Configuration"
                      : drawerContent.item === "advanced"
                        ? "Advanced Settings"
                        : drawerContent.item === "danger"
                          ? "Danger Zone"
                          : "General Settings"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isMobile && canAddWindow() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDetachWindow}
                    className="h-9 w-9"
                    title="Detach to floating window"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDrawerClose}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Settings Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {(() => {
                  switch (drawerContent.item) {
                    case "general":
                      return <ProjectGeneralSettings project={project} />;

                    case "agents":
                      return <ProjectAgentsSettings project={project} />;

                    case "tools":
                      return <ProjectToolsSettings project={project} />;

                    case "advanced":
                      return <ProjectAdvancedSettings project={project} />;

                    case "danger":
                      return (
                        <ProjectDangerZone
                          project={project}
                          onDelete={handleDrawerClose}
                        />
                      );

                    default:
                      return <ProjectGeneralSettings project={project} />;
                  }
                })()}
              </div>
            </ScrollArea>
          </div>
        );

      default:
        return null;
    }
  };

  // Calculate column width classes - removed since we'll use flex-1

  if (openProjects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/10">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No projects open</h2>
          <p className="text-muted-foreground">
            Select projects from the sidebar to view them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full relative", className)}>
      {/* Container for project columns */}
      <div className="flex h-full overflow-x-auto">
        {openProjects.map((project) => (
          <ProjectColumn
            key={project.dTag || project.encode()}
            project={project}
            onItemClick={handleItemClick}
            className="w-80 flex-shrink-0"
          />
        ))}
      </div>

      {/* Drawer for detail views */}
      <Sheet
        open={!!drawerContent}
        onOpenChange={(open) => {
          // Only allow closing via the close button, not outside clicks
          if (!open) handleDrawerClose();
        }}
        modal={false}
      >
        <SheetContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={cn(
            "p-0 flex flex-col [&>button:first-child]:hidden",
            // Use different widths based on content type
            drawerContent?.type === "docs"
              ? "w-[65%] sm:max-w-[65%]" // Narrower for documentation
              : "w-[85%] sm:max-w-[85%]", // Wider for conversations and other content
          )}
          side="right"
        >
          {drawerContent && renderDrawerContent()}
        </SheetContent>
      </Sheet>

      {/* Call View Overlay */}
      {showCallView && callViewProject && (
        <CallView
          project={callViewProject}
          onClose={(rootEvent) => {
            setShowCallView(false);
            setCallViewProject(null);
            // If a conversation was created during the call, open it in the drawer
            if (rootEvent) {
              setSelectedThreadEvent(rootEvent);
              setDrawerContent({
                project: callViewProject,
                type: "conversations",
                item: rootEvent,
                data: rootEvent,
              });
            }
          }}
          extraTags={
            selectedThreadEvent ? [["E", selectedThreadEvent.id]] : undefined
          }
        />
      )}

      {/* Floating Windows Manager - Desktop only */}
      {!isMobile && <WindowManager onAttach={handleAttachWindow} />}
    </div>
  );
}
