import { useState, useMemo } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Plus, Settings, LogOut, Search, Bot, Wrench, Home, User } from 'lucide-react'
import { CreateProjectDialog } from '../dialogs/CreateProjectDialog'
import { GlobalSearchDialog } from '../dialogs/GlobalSearchDialog'
import { useGlobalSearchShortcut } from '@/hooks/useKeyboardShortcuts'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectsStore } from '@/stores/projects'
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
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNDKCurrentPubkey, useProfileValue, useNDKSessionLogout, useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'

interface CollapsibleProjectsSidebarProps {
  className?: string
  onProjectSelect?: () => void
}

export function CollapsibleProjectsSidebar({ onProjectSelect }: CollapsibleProjectsSidebarProps) {
  const currentPubkey = useNDKCurrentPubkey();
  const currentUser = useNDKCurrentUser();
  const userProfile = useProfileValue(currentPubkey);
  const ndkLogout = useNDKSessionLogout();
  const navigate = useNavigate();
  const location = useLocation()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  
  // Add keyboard shortcut for global search
  useGlobalSearchShortcut(() => setSearchDialogOpen(true))

  const handleLogout = () => {
    if (currentUser) {
      ndkLogout(currentUser.pubkey);
    }
    navigate({ to: '/login' });
  };

  // Use the cached array from the store to prevent infinite loops
  const projectsWithStatus = useProjectsStore(state => state.projectsWithStatusArray)
  
  // Sort projects - online first, then by title
  const sortedProjectsWithStatus = useMemo(() => {
    if (!projectsWithStatus || projectsWithStatus.length === 0) {
      return []
    }
    
    return [...projectsWithStatus].sort((a, b) => {
      // Sort online projects first, then by title
      if (a.status?.isOnline !== b.status?.isOnline) {
        return a.status?.isOnline ? -1 : 1
      }
      return a.project.title.localeCompare(b.project.title)
    })
  }, [projectsWithStatus])

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-between">
                <SidebarMenuButton size="lg" asChild>
                  <Link to="/projects" params={{}}>
                    <Home className="size-4" />
                    <span className="font-bold">TENEX</span>
                  </Link>
                </SidebarMenuButton>
                <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                  {/* User Profile Dropdown - only visible when expanded */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={userProfile?.image} />
                          <AvatarFallback>
                            {userProfile?.name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {userProfile && (
                        <div className="px-2 py-1.5">
                          <p className="text-sm font-medium">
                            {userProfile.name || userProfile.displayName || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userProfile.nip05 || userProfile.lud16 || ''}
                          </p>
                        </div>
                      )}
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
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <SidebarTrigger className="h-8 w-8" />
                </div>
              </div>
            </SidebarMenuItem>
            {/* Sidebar toggle when collapsed - separate item */}
            <SidebarMenuItem className="group-data-[collapsible=icon]:flex hidden">
              <SidebarMenuButton asChild>
                <SidebarTrigger />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

          <SidebarContent>
            {/* Quick actions when collapsed */}
            <SidebarGroup className="group-data-[collapsible=icon]:flex hidden">
              <SidebarMenu>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton onClick={() => setSearchDialogOpen(true)}>
                        <Search className="h-5 w-5" />
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Global Search (⌘K)</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

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
                  {/* Add new project button when collapsed */}
                  <SidebarMenuItem className="group-data-[collapsible=icon]:flex hidden">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-5 w-5" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        New Project
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>

                  {/* Projects List */}
                  <ScrollArea className="h-[400px]">
                    {sortedProjectsWithStatus.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm group-data-[collapsible=icon]:hidden">
                        No projects yet
                      </div>
                    ) : (
                      sortedProjectsWithStatus.map(({ project, status }) => (
                        <SidebarMenuItem key={project.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                asChild
                                isActive={location.pathname.includes(project.id)}
                              >
                                <Link 
                                  to="/projects/$projectId" 
                                  params={{ projectId: project.id }}
                                  onClick={onProjectSelect}
                                >
                                  <div className="relative">
                                    <Avatar className="h-6 w-6 shrink-0 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                                      <AvatarImage src={project.picture} />
                                      <AvatarFallback className="text-xs group-data-[collapsible=icon]:text-sm">
                                        {project.title.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    {status?.isOnline && (
                                      <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background group-data-[collapsible=icon]:h-2.5 group-data-[collapsible=icon]:w-2.5" />
                                    )}
                                  </div>
                                  <span className="group-data-[collapsible=icon]:hidden truncate">
                                    {project.title}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="group-data-[collapsible=icon]:flex hidden">
                                {project.title}
                              </TooltipContent>
                            </Tooltip>
                          </SidebarMenuItem>
                        ))
                      )}
                    </ScrollArea>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
              {/* Show user menu when collapsed */}
              <SidebarMenu>
                <SidebarMenuItem className="group-data-[collapsible=icon]:flex hidden">
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={userProfile?.picture} />
                              <AvatarFallback className="text-sm">
                                {userProfile?.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">Profile Menu</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" align="end" className="w-56">
                      {userProfile && (
                        <div className="px-2 py-1.5">
                          <p className="text-sm font-medium">
                            {userProfile.name || userProfile.displayName || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userProfile.nip05 || userProfile.lud16 || ''}
                          </p>
                        </div>
                      )}
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
  )
}