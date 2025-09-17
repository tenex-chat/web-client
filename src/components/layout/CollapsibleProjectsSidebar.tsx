import { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  Plus,
  Settings,
  LogOut,
  Search,
  Bot,
  Wrench,
  Home,
  User,
  Sun,
  Moon,
  Monitor,
  Check,
  Inbox,
} from "lucide-react";
import { useAtom } from "jotai";
import { CreateProjectDialog } from "@/components/dialogs/CreateProjectDialog";
import { GlobalSearchDialog } from "@/components/dialogs/GlobalSearchDialog";
import { useGlobalSearchShortcut } from "@/hooks/useKeyboardShortcuts";
import { useSortedProjects } from "@/hooks/useSortedProjects";
import { useTheme } from "@/hooks/useTheme";
import { useInboxUnreadCount } from "@/hooks/useInboxEvents";
import { useGlobalAgents } from "@/stores/agents";
import { useProfile } from "@nostr-dev-kit/ndk-hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNDKCurrentPubkey,
  useProfileValue,
  useNDKSessionLogout,
  useNDKCurrentUser,
} from "@nostr-dev-kit/ndk-hooks";
import {
  openProjectsAtom,
  toggleProjectAtom,
  isProjectOpenAtom,
} from "@/stores/openProjects";

interface CollapsibleProjectsSidebarProps {
  className?: string;
  onProjectSelect?: () => void;
}

function GlobalAgentItem({ pubkey, slug }: { pubkey: string; slug: string }) {
  const profile = useProfile(pubkey);
  const navigate = useNavigate();

  const displayName = profile?.displayName || profile?.name || slug;
  const avatarUrl = profile?.image || profile?.picture;

  const handleClick = () => {
    navigate({ to: "/p/$pubkey", params: { pubkey } });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleClick}>
              <Avatar className="h-6 w-6 shrink-0 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-xs group-data-[collapsible=icon]:text-sm">
                  {displayName[0]?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <span className="group-data-[collapsible=icon]:hidden truncate">
                {displayName}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="group-data-[collapsible=icon]:flex hidden"
        >
          {displayName}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CollapsibleProjectsSidebar({
  onProjectSelect,
}: CollapsibleProjectsSidebarProps) {
  const currentPubkey = useNDKCurrentPubkey();
  const currentUser = useNDKCurrentUser();
  const userProfile = useProfileValue(currentPubkey);
  const ndkLogout = useNDKSessionLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [openProjects] = useAtom(openProjectsAtom);
  const [, toggleProject] = useAtom(toggleProjectAtom);
  const isProjectOpen = useAtom(isProjectOpenAtom)[0];

  // Add keyboard shortcut for global search
  useGlobalSearchShortcut(() => setSearchDialogOpen(true));
  
  // Get inbox unread count
  const inboxUnreadCount = useInboxUnreadCount();

  const handleLogout = () => {
    if (currentUser) {
      ndkLogout(currentUser.pubkey);
    }
    navigate({ to: "/login" });
  };

  // Use the sorted projects hook for consistent ordering
  const sortedProjects = useSortedProjects();
  const globalAgents = useGlobalAgents();

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader>
          <SidebarMenu>
            {/* Header content - only visible when expanded */}
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <div className="flex items-center justify-between">
                <SidebarMenuButton 
                  size="lg" 
                  onClick={() => {
                    console.log('[Sidebar] TENEX home button clicked, navigating to /projects');
                    navigate({ to: "/projects" });
                  }}
                >
                  <Home className="size-4" />
                  <span className="font-bold">TENEX</span>
                </SidebarMenuButton>
                <SidebarTrigger className="h-8 w-8" />
              </div>
            </SidebarMenuItem>
            {/* House button when collapsed - at the top */}
            <SidebarMenuItem className="group-data-[collapsible=icon]:flex hidden">
              <SidebarMenuButton 
                size="lg" 
                onClick={() => {
                  console.log('[Sidebar] Home icon clicked (collapsed), navigating to /projects');
                  navigate({ to: "/projects" });
                }}
              >
                <Home className="size-5" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {/* Projects */}
              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden flex items-center justify-between">
                  <span>Projects</span>
                  <div className="flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => setSearchDialogOpen(true)}
                        >
                          <Search className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Global Search</span>
                        <span className="ml-2 text-muted-foreground">⌘K</span>
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 -mr-1"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sortedProjects.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm group-data-[collapsible=icon]:hidden">
                        No projects yet
                      </div>
                    ) : (
                      sortedProjects.map(({ project, status }) => {
                        const projectIdentifier =
                          project.dTag || project.encode();
                        const isOpen = isProjectOpen(projectIdentifier);
                        
                        // Long press detection state
                        let longPressTimer: NodeJS.Timeout | null = null;
                        let isLongPress = false;
                        
                        const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
                          // Prevent default to avoid text selection
                          e.preventDefault();
                          isLongPress = false;
                          longPressTimer = setTimeout(() => {
                            isLongPress = true;
                            // Navigate to project detail page on long press
                            const projectId = project.dTag || project.encode();
                            console.log('[Sidebar] Long press detected, navigating to project detail:', projectId);
                            navigate({ 
                              to: "/projects/$projectId", 
                              params: { projectId }
                            });
                            onProjectSelect?.();
                          }, 500); // 500ms for long press
                        };
                        
                        const handleMouseUp = () => {
                          if (longPressTimer) {
                            clearTimeout(longPressTimer);
                            longPressTimer = null;
                          }
                          
                          // If it wasn't a long press, handle normal click
                          if (!isLongPress) {
                            const currentPath = location.pathname;
                            const projectId = project.dTag || project.encode();
                            console.log('[Sidebar] Project clicked:', projectId, 'Current path:', currentPath);
                            
                            // If we're on the base /projects page, toggle the column
                            if (currentPath === '/projects' || currentPath === '/projects/') {
                              console.log('[Sidebar] Toggling project column:', projectId);
                              toggleProject(project);
                            } else if (currentPath.startsWith('/projects/')) {
                              // We're already viewing a project detail page, navigate to the new one
                              console.log('[Sidebar] Switching to project:', projectId);
                              navigate({ 
                                to: "/projects/$projectId", 
                                params: { projectId }
                              });
                            } else {
                              // We're on a non-project page (inbox, agents, etc.)
                              // Toggle the project for multi-column view and stay on current page
                              toggleProject(project);
                              
                              // List of routes where we should stay on the current page
                              const protectedRoutes = [
                                '/inbox',
                                '/agents', 
                                '/settings',
                                '/chat',
                                '/p/',
                                '/mcp-tools'
                              ];
                              
                              const shouldStayOnCurrentPage = protectedRoutes.some(route => 
                                currentPath.startsWith(route)
                              );
                              
                              if (!shouldStayOnCurrentPage) {
                                // For any other pages, navigate to the multi-column projects view
                                console.log('[Sidebar] Navigating to /projects for multi-column view');
                                navigate({ to: "/projects" });
                              }
                            }
                            
                            onProjectSelect?.();
                          }
                          isLongPress = false;
                        };
                        
                        const handleMouseLeave = () => {
                          if (longPressTimer) {
                            clearTimeout(longPressTimer);
                            longPressTimer = null;
                          }
                          isLongPress = false;
                        };
                        
                        return (
                          <SidebarMenuItem key={projectIdentifier}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton
                                  onMouseDown={handleMouseDown}
                                  onMouseUp={handleMouseUp}
                                  onMouseLeave={handleMouseLeave}
                                  onTouchStart={handleMouseDown}
                                  onTouchEnd={handleMouseUp}
                                  isActive={isOpen}
                                  className={isOpen ? "bg-accent" : ""}
                                >
                                  <div className="relative">
                                    <ProjectAvatar
                                      project={project}
                                      className="h-6 w-6 shrink-0 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
                                      fallbackClassName="text-xs group-data-[collapsible=icon]:text-sm"
                                    />
                                    {status?.isOnline && (
                                      <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background group-data-[collapsible=icon]:h-2.5 group-data-[collapsible=icon]:w-2.5" />
                                    )}
                                  </div>
                                  <span className="group-data-[collapsible=icon]:hidden truncate flex-1 text-left">
                                    {project.title}
                                  </span>
                                  {isOpen && (
                                    <Check className="h-3.5 w-3.5 ml-auto group-data-[collapsible=icon]:hidden text-primary" />
                                  )}
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="group-data-[collapsible=icon]:flex hidden"
                              >
                                {project.title}
                                {isOpen && " (Open)"}
                              </TooltipContent>
                            </Tooltip>
                          </SidebarMenuItem>
                        );
                      })
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* Agents */}
              {globalAgents.length > 0 && (
                <SidebarGroup className="pt-0">
                  <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                    Agents
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {globalAgents.map((agent) => (
                        <GlobalAgentItem
                          key={agent.pubkey}
                          pubkey={agent.pubkey}
                          slug={agent.slug}
                        />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </div>
          </ScrollArea>
        </SidebarContent>

        {/* Inbox button above footer */}
        <div className="border-t px-3 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton 
                      asChild
                      className="w-full justify-start group-data-[collapsible=icon]:justify-center relative"
                    >
                      <Link 
                        to="/inbox" 
                        params={{}}
                        onClick={(e) => {
                          console.log('[Sidebar] Navigating to inbox');
                          // Let the Link component handle navigation
                        }}
                      >
                        <div className="relative">
                          <Inbox className="h-5 w-5" />
                          {inboxUnreadCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] animate-pulse-glow shadow-lg"
                              style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}
                            >
                              {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
                            </Badge>
                          )}
                        </div>
                        <span className="group-data-[collapsible=icon]:hidden ml-2">
                          Inbox
                          {inboxUnreadCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {inboxUnreadCount}
                            </Badge>
                          )}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>
                      Inbox
                      {inboxUnreadCount > 0 && ` (${inboxUnreadCount} unread)`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="w-full justify-start group-data-[collapsible=icon]:justify-center"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={userProfile?.image || userProfile?.picture}
                      />
                      <AvatarFallback className="text-sm">
                        {userProfile?.name?.[0]?.toUpperCase() || (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-medium">
                        {userProfile?.name ||
                          userProfile?.displayName ||
                          "User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {userProfile?.nip05 || currentUser?.npub}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/agents" params={{}}>
                      <Bot className="h-4 w-4 mr-2" />
                      Agents
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/mcp-tools" params={{}}>
                      <Wrench className="h-4 w-4 mr-2" />
                      MCP Tools
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" params={{}}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      {theme === "light" ? (
                        <Sun className="h-4 w-4 mr-2" />
                      ) : theme === "dark" ? (
                        <Moon className="h-4 w-4 mr-2" />
                      ) : (
                        <Monitor className="h-4 w-4 mr-2" />
                      )}
                      <span>Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={theme}
                        onValueChange={(value) =>
                          setTheme(value as "light" | "dark" | "system")
                        }
                      >
                        <DropdownMenuRadioItem value="light">
                          <Sun className="h-4 w-4 mr-2" />
                          Light
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark">
                          <Moon className="h-4 w-4 mr-2" />
                          Dark
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="system">
                          <Monitor className="h-4 w-4 mr-2" />
                          System
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Global Search Dialog */}
      <GlobalSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />
    </TooltipProvider>
  );
}
