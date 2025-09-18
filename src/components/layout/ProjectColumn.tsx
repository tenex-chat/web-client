import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  MessageSquare,
  FileText,
  Bot,
  Settings,
  Plus,
  WifiOff,
  ArrowLeft,
  Hash,
  Phone,
  Users,
  Rss,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { NDKArticle, NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { AddAgentsToProjectDialog } from "@/components/dialogs/AddAgentsToProjectDialog";
import { useProjectStatus } from "@/stores/projects";
import { bringProjectOnline } from "@/lib/utils/projectStatusUtils";
import { ProjectStatusIndicator } from "@/components/status/ProjectStatusIndicator";
// import { FABMenu } from "@/components/ui/fab-menu"; // TODO: Create FABMenu component
import { EventModal } from "@/components/hashtags/EventModal";
import { useWindowManager } from "@/stores/windowManager";
import {
  ConversationsContent,
  DocsContent,
  AgentsContent,
  HashtagsContent,
  SettingsContent,
  FeedContent,
  TabContentProps,
} from "./tab-contents";

type TabType = "conversations" | "docs" | "agents" | "settings" | "hashtags" | "community";
type ViewMode = "column" | "standalone";
type ViewState = "list" | "detail";

/**
 * Generate a deterministic HSL color based on a string
 * Same function as in project-avatar.tsx to ensure consistency
 */
function generateColorFromString(str: string): string {
  if (!str) return "hsl(213, 27%, 64%)"; // Default slate-400 if no string provided

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

// Map of tab types to their content components
const TAB_CONTENT_COMPONENTS: Record<TabType, React.FC<TabContentProps>> = {
  conversations: ConversationsContent,
  docs: DocsContent,
  agents: AgentsContent,
  hashtags: HashtagsContent,
  community: FeedContent,
  settings: SettingsContent,
};

interface ProjectColumnProps {
  project: NDKProject;
  onItemClick?: (
    project: NDKProject,
    itemType: TabType,
    item?: string | NDKEvent,
  ) => void;
  mode?: ViewMode;
  renderFullContent?: (
    project: NDKProject,
    itemType: TabType,
    item?: any,
    onBack?: () => void,
    onVoiceCallClick?: () => void,
  ) => React.ReactNode;
  className?: string;
  viewMode?: "mobile" | "desktop";
}

export function ProjectColumn({
  project,
  onItemClick,
  mode = "column",
  renderFullContent,
  className,
  viewMode = "mobile",
}: ProjectColumnProps) {
  const [activeTab, setActiveTab] = useState<TabType>("conversations");
  const [selectedThread, setSelectedThread] = useState<NDKEvent>();
  const [selectedItem, setSelectedItem] = useState<any>();
  const [viewState, setViewState] = useState<ViewState>("list");
  const [addAgentsDialogOpen, setAddAgentsDialogOpen] = useState(false);
  const [hashtagEventModalOpen, setHashtagEventModalOpen] = useState(false);
  const [selectedHashtagEvent, setSelectedHashtagEvent] = useState<NDKEvent | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { ndk } = useNDK();
  const agents = useProjectOnlineAgents(project?.dTag);
  const windowManager = useWindowManager();
  const projectStatus = useProjectStatus(project?.dTag);
  
  // Long press detection refs
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Generate project color for the glow effect
  const projectColor = useMemo(() => {
    return generateColorFromString(project?.dTag || "");
  }, [project?.dTag]);

  // Reset state when project changes
  useEffect(() => {
    setActiveTab("conversations");
    setSelectedThread(undefined);
    setSelectedItem(undefined);
    setViewState("list");
  }, [project.dTag]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleThreadSelect = useCallback(
    async (threadId: string) => {
      if (threadId === "new") {
        setSelectedThread(undefined);
        setSelectedItem(undefined);
        if (mode === "standalone") {
          setViewState("detail");
        } else if (onItemClick) {
          onItemClick(project, "conversations", "new");
        }
      } else if (ndk) {
        const threadEvent = await ndk.fetchEvent(threadId);
        if (threadEvent) {
          setSelectedThread(threadEvent);
          setSelectedItem(threadEvent);
          if (mode === "standalone") {
            setViewState("detail");
          } else if (onItemClick) {
            onItemClick(project, "conversations", threadEvent);
          }
        }
      }
    },
    [ndk, mode, onItemClick, project],
  );

  const handleDocumentSelect = useCallback(
    (article: NDKArticle) => {
      setSelectedItem(article);
      if (mode === "standalone") {
        setViewState("detail");
      } else if (onItemClick) {
        onItemClick(project, "docs", article);
      }
    },
    [mode, onItemClick, project],
  );

  const handleAgentSelect = useCallback(
    (agentPubkey: string) => {
      setSelectedItem(agentPubkey);
      if (mode === "standalone") {
        setViewState("detail");
      } else if (onItemClick) {
        onItemClick(project, "agents", agentPubkey);
      }
    },
    [mode, onItemClick, project],
  );

  const handleBringOnline = useCallback(async () => {
    if (!ndk) return;
    await bringProjectOnline(project, ndk);
  }, [project, ndk]);

  const handleThreadSelectWrapper = useCallback(
    async (thread: NDKEvent) => {
      await handleThreadSelect(thread.id);
    },
    [handleThreadSelect],
  );
  
  // Handle long press for the add button
  const handleAddButtonMouseDown = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to avoid text selection on long press
    e?.preventDefault();
    
    if (activeTab === "conversations") {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        setDropdownOpen(true);
      }, 500); // 500ms for long press
    }
  }, [activeTab]);

  const handleAddButtonMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // If it wasn't a long press and it's conversations tab, trigger new conversation
    if (!isLongPress.current) {
      if (activeTab === "conversations") {
        // Short press - trigger new conversation
        if (onItemClick) {
          onItemClick(project, "conversations", "new");
        }
      } else if (activeTab === "agents") {
        setAddAgentsDialogOpen(true);
      } else if (onItemClick) {
        onItemClick(project, activeTab, "new");
      }
    }
    
    isLongPress.current = false;
  }, [activeTab, onItemClick, project]);
  
  const handleAddButtonMouseLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isLongPress.current = false;
  }, []);
  
  // Handle dropdown menu actions
  const handleNewConversation = useCallback(() => {
    setDropdownOpen(false);
    if (onItemClick) {
      onItemClick(project, "conversations", "new");
    }
  }, [onItemClick, project]);
  
  const handleNewVoiceCall = useCallback(() => {
    setDropdownOpen(false);
    // Open CallView in a floating window
    windowManager.addWindow({
      project,
      type: "call" as any,
      data: {
        onCallEnd: (rootEvent: NDKEvent | null) => {
          // If a conversation was created during the call, select it
          if (rootEvent) {
            setSelectedThread(rootEvent);
            setViewState("detail");
          }
        }
      }
    });
  }, [project, windowManager]);

  const renderContent = () => {
    // In standalone mode with detail view, render full content
    if (mode === "standalone" && viewState === "detail" && renderFullContent) {
      return renderFullContent(
        project,
        activeTab,
        selectedItem,
        () => {
          setViewState("list");
          setSelectedItem(undefined);
          setSelectedThread(undefined);
        },
        () => {
          // Handle voice call click - open in floating window
          windowManager.addWindow({
            project,
            type: "call" as any,
            data: {
              rootEvent: selectedThread,
              onCallEnd: (rootEvent: NDKEvent | null) => {
                // If a conversation was created during the call, select it
                if (rootEvent) {
                  setSelectedThread(rootEvent);
                  setViewState("detail");
                }
              }
            }
          });
        },
      );
    }

    // Use component map to render the appropriate tab content
    const ContentComponent = TAB_CONTENT_COMPONENTS[activeTab];
    if (!ContentComponent) return null;

    // Prepare props for the content component
    const contentProps: TabContentProps = {
      project,
      selectedThread,
      onThreadSelect: handleThreadSelectWrapper,
      onDocumentSelect: handleDocumentSelect,
      onAgentSelect: handleAgentSelect,
      onHashtagEventClick: (event: NDKEvent) => {
        setSelectedHashtagEvent(event);
        setHashtagEventModalOpen(true);
      },
      onSettingsItemClick: (item: string) => {
        onItemClick?.(project, "settings", item);
      },
      onEventClick: async (event: NDKEvent) => {
        // Handle community event clicks - open in modal or navigate based on type
        if (event.kind === 24133) {
          // Conversation root - select as thread
          handleThreadSelectWrapper(event);
        } else if (event.kind === 30023) {
          // Document - handle as document
          onDocumentSelect?.(event as NDKArticle);
        } else if (event.kind === 1111) {
          // Reply event - find and open the parent conversation
          const eTags = event.tags.filter(tag => tag[0] === 'e');
          if (eTags.length > 0) {
            // The first e-tag is typically the root/parent event
            const parentId = eTags[0][1];
            if (parentId) {
              // Open the parent conversation
              await handleThreadSelect(parentId);
            } else {
              // Fallback: open the reply in modal
              setSelectedHashtagEvent(event);
              setHashtagEventModalOpen(true);
            }
          } else {
            // No e-tags found, open in modal
            setSelectedHashtagEvent(event);
            setHashtagEventModalOpen(true);
          }
        } else {
          // Other events (hashtags, etc) - open in modal
          setSelectedHashtagEvent(event);
          setHashtagEventModalOpen(true);
        }
      },
      agents,
    };

    return <ContentComponent {...contentProps} />;
  };

  const tabs = useMemo(() => {
    const baseTabs: Array<{ id: TabType; icon: any; label: string }> = [
      { id: "conversations", icon: MessageSquare, label: "Conversations" },
      { id: "docs", icon: FileText, label: "Documentation" },
      { id: "agents", icon: Bot, label: "Agents" },
      { id: "hashtags", icon: Hash, label: "Hashtags" },
      { id: "community", icon: Rss, label: "Feed" },
      { id: "settings", icon: Settings, label: "Settings" },
    ];

    return baseTabs;
  }, []);

  // For standalone mode with detail view, render differently
  if (mode === "standalone" && viewState === "detail") {
    // For conversations, let ChatInterface handle its own header
    if (activeTab === "conversations") {
      return (
        <>
          <div className={cn("flex flex-col h-full relative", className)}>
            {renderContent()}
          </div>
        </>
      );
    }

    // For other tabs, keep the existing header
    return (
      <>
        <div className={cn("flex flex-col h-full relative", className)}>
          {/* Mobile-style header with back button */}
          <div className="border-b px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2"
              onClick={() => {
                setViewState("list");
                setSelectedItem(undefined);
                setSelectedThread(undefined);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 flex-1">
              <ProjectAvatar
                project={project}
                className="h-8 w-8"
                fallbackClassName="text-xs"
              />
              <div>
                <h1 className="text-sm font-semibold">
                  {project.title || "Untitled Project"}
                </h1>
              </div>
            </div>
          </div>

          {/* Full content */}
          <div className="flex-1 overflow-hidden">{renderContent()}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col bg-muted/5 relative overflow-hidden",
          mode === "column" ? "border-r" : "",
          className,
        )}
      >
        {/* Glow effect at the top - more colorful gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, ${projectColor.replace("55%", "60%").replace("65%", "70%").replace(")", ", 0.18)")}, transparent)`,
          }}
        />

        {/* Column Header */}
        <div className="border-b relative">
          {mode === "standalone" ? (
            // Standalone header - different styles for mobile vs desktop
            viewMode === "desktop" ? (
              // Desktop standalone header with inline tabs
              <div>
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center gap-4">
                    <ProjectAvatar
                      project={project}
                      className="h-10 w-10"
                      fallbackClassName="text-sm"
                    />
                    <div className="flex-1 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold">
                          {project.title || "Untitled Project"}
                        </h1>
                        <ProjectStatusIndicator
                          status={projectStatus?.isOnline ? "online" : "offline"}
                          size="sm"
                          onClick={handleBringOnline}
                        />
                      </div>

                      {/* Desktop inline tabs */}
                      <div className="flex items-center gap-1 ml-auto">
                        {tabs.map((tab) => (
                          <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? "secondary" : "ghost"}
                            size="sm"
                            className="gap-1.5 h-8"
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <tab.icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{tab.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Users className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Mobile standalone header
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <ProjectAvatar
                    project={project}
                    className="h-10 w-10"
                    fallbackClassName="text-sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-base font-semibold">
                        {project.title || "Untitled Project"}
                      </h1>
                      <ProjectStatusIndicator
                        status={projectStatus?.isOnline ? "online" : "offline"}
                        size="sm"
                        onClick={handleBringOnline}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            // Column mode header (original)
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <ProjectAvatar
                  project={project}
                  className="h-6 w-6"
                  fallbackClassName="text-xs"
                />
                <h3 className="font-medium text-sm truncate flex-1 flex items-center gap-1.5">
                  <Link 
                    to="/projects/$projectId" 
                    params={{ projectId: project.dTag || project.encode() }}
                    className="hover:underline hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {project.title || "Untitled Project"}
                  </Link>
                  {(!projectStatus || !projectStatus.isOnline) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={handleBringOnline}
                          >
                            <WifiOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Project is offline. Click to bring online.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </h3>
              </div>
            </div>
          )}

          {/* Icon Tab Bar - hide in desktop standalone mode since tabs are inline */}
          {!(mode === "standalone" && viewMode === "desktop") && (
            <div className="flex items-center justify-between px-2 pb-1">
              <TooltipProvider>
                <div className="flex gap-1">
                  {tabs.map((tab) => (
                    <Tooltip key={tab.id}>
                    <TooltipTrigger asChild>
                      <button
                        id={`${tab.id}-tab`}
                        onClick={() => setActiveTab(tab.id)}
                        data-test-id={`tab-button-${tab.id === 'docs' ? 'documentation' : tab.id}`}
                        className={cn(
                          "px-3 py-1.5 relative transition-all rounded-sm group",
                          activeTab === tab.id
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        style={{
                          backgroundColor:
                            activeTab === tab.id
                              ? projectColor.replace(")", ", 0.12)")
                              : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (activeTab !== tab.id) {
                            e.currentTarget.style.backgroundColor =
                              projectColor.replace(")", ", 0.06)");
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeTab !== tab.id) {
                            e.currentTarget.style.backgroundColor = "";
                          }
                        }}
                      >
                        <tab.icon className="h-4 w-4" />
                        {activeTab === tab.id && (
                          <div
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                            style={{
                              backgroundColor: projectColor.replace(
                                "55%",
                                "65%",
                              ),
                            }}
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tab.label}</p>
                    </TooltipContent>
                  </Tooltip>
                  ))}
                </div>
            </TooltipProvider>

            {/* Add button - conditionally shown based on active tab and mode */}
            {mode === "column" &&
              (activeTab === "conversations" ||
                activeTab === "docs" ||
                activeTab === "agents") && (
                activeTab === "conversations" ? (
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onMouseDown={handleAddButtonMouseDown}
                        onMouseUp={handleAddButtonMouseUp}
                        onMouseLeave={handleAddButtonMouseLeave}
                        onTouchStart={handleAddButtonMouseDown}
                        onTouchEnd={handleAddButtonMouseUp}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={5}>
                      <DropdownMenuItem onClick={handleNewConversation}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        New Conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleNewVoiceCall}>
                        <Phone className="mr-2 h-4 w-4" />
                        New Voice Call
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      if (activeTab === "agents") {
                        setAddAgentsDialogOpen(true);
                      } else if (onItemClick) {
                        onItemClick(project, activeTab, "new");
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )
              )}
            </div>
          )}
        </div>

        {/* Column Content */}
        <div className="flex-1 overflow-hidden">{renderContent()}</div>

        {/* FAB for standalone mode - TODO: Implement FABMenu component */}
        {/* {mode === "standalone" &&
          activeTab === "conversations" &&
          viewState === "list" && (
            <FABMenu
              onTextClick={() => {
                setSelectedThread(undefined);
                setSelectedItem(undefined);
                setViewState("detail");
              }}
              onVoiceClick={() => {
                // Open CallView in a floating window
                windowManager.addWindow({
                  project,
                  type: "call" as any,
                  data: {
                    onCallEnd: (rootEvent: NDKEvent | null) => {
                      // If a conversation was created during the call, select it
                      if (rootEvent) {
                        setSelectedThread(rootEvent);
                        setViewState("detail");
                      }
                    }
                  }
                });
              }}
              offset={{ bottom: "16px" }}
            />
          )} */}

      </div>

      <AddAgentsToProjectDialog
        open={addAgentsDialogOpen}
        onOpenChange={setAddAgentsDialogOpen}
        project={project}
        existingAgentIds={agents.map((a) => a.pubkey)}
      />

      <EventModal
        event={selectedHashtagEvent}
        isOpen={hashtagEventModalOpen}
        onClose={() => {
          setHashtagEventModalOpen(false);
          setSelectedHashtagEvent(null);
        }}
      />
    </>
  );
}
