import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, Settings, LogOut, Search, Bot, Wrench, Home, User, Sun, Moon, Monitor, Check } from 'lucide-react'
import { useAtom } from 'jotai'
import { CreateProjectDialog } from '@/components/dialogs/CreateProjectDialog'
import { GlobalSearchDialog } from '@/components/dialogs/GlobalSearchDialog'
import { useGlobalSearchShortcut } from '@/hooks/useKeyboardShortcuts'
import { useSortedProjects } from '@/hooks/useSortedProjects'
import { useTheme } from '@/hooks/useTheme'
import { useGlobalAgents } from '@/stores/agents'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProjectAvatar } from '@/components/ui/project-avatar'
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
} from '@/components/ui/dropdown-menu'
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
import { openProjectsAtom, toggleProjectAtom, isProjectOpenAtom } from '@/stores/openProjects'

interface CollapsibleProjectsSidebarProps {
  className?: string
  onProjectSelect?: () => void
}

function GlobalAgentItem({ pubkey, slug }: { pubkey: string; slug: string }) {
  const profile = useProfile(pubkey)
  const navigate = useNavigate()
  
  const displayName = profile?.displayName || profile?.name || slug
  const avatarUrl = profile?.image || profile?.picture
  
  const handleClick = () => {
    navigate({ to: '/p/$pubkey', params: { pubkey } })
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleClick}>
              <Avatar className="h-6 w-6 shrink-0 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-xs group-data-[collapsible=icon]:text-sm">
                  {displayName[0]?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="group-data-[collapsible=icon]:hidden truncate">
                {displayName}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </TooltipTrigger>
        <TooltipContent side="right" className="group-data-[collapsible=icon]:flex hidden">
          {displayName}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function CollapsibleProjectsSidebar({ onProjectSelect }: CollapsibleProjectsSidebarProps) {
  const currentPubkey = useNDKCurrentPubkey();
  const currentUser = useNDKCurrentUser();
  const userProfile = useProfileValue(currentPubkey);
  const ndkLogout = useNDKSessionLogout();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [openProjects] = useAtom(openProjectsAtom)
  const [, toggleProject] = useAtom(toggleProjectAtom)
  const isProjectOpen = useAtom(isProjectOpenAtom)[0]
  
  // Add keyboard shortcut for global search
  useGlobalSearchShortcut(() => setSearchDialogOpen(true))

  const handleLogout = () => {
    if (currentUser) {
      ndkLogout(currentUser.pubkey);
    }
    navigate({ to: '/login' });
  };

  // Use the sorted projects hook for consistent ordering
  const sortedProjects = useSortedProjects()
  const globalAgents = useGlobalAgents()

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader>
          <SidebarMenu>
            {/* Header content - only visible when expanded */}
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <div className="flex items-center justify-between">
                <SidebarMenuButton size="lg" asChild>
                  <Link to="/projects" params={{}}>
                    <Home className="size-4" />
                    <span className="font-bold">TENEX</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarTrigger className="h-8 w-8" />
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
                          const projectIdentifier = project.dTag || project.encode()
                          const isOpen = isProjectOpen(projectIdentifier)
                          return (
                            <SidebarMenuItem key={projectIdentifier}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SidebarMenuButton
                                    onClick={(e) => {
                                      e.preventDefault()
                                      toggleProject(project)
                                      // Always navigate to projects view when toggling projects
                                      navigate({ to: '/projects' })
                                      onProjectSelect?.()
                                    }}
                                    isActive={isOpen}
                                    className={isOpen ? 'bg-accent' : ''}
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
                                <TooltipContent side="right" className="group-data-[collapsible=icon]:flex hidden">
                                  {project.title}
                                  {isOpen && ' (Open)'}
                                </TooltipContent>
                              </Tooltip>
                            </SidebarMenuItem>
                          )
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
                          <AvatarImage src={userProfile?.image || userProfile?.picture} />
                          <AvatarFallback className="text-sm">
                            {userProfile?.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                          <span className="text-sm font-medium">
                            {userProfile?.name || userProfile?.displayName || 'User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {userProfile?.nip05 || currentUser?.npub}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      side="right" 
                      align="end" 
                      className="w-56"
                    >
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
                          {theme === 'light' ? (
                            <Sun className="h-4 w-4 mr-2" />
                          ) : theme === 'dark' ? (
                            <Moon className="h-4 w-4 mr-2" />
                          ) : (
                            <Monitor className="h-4 w-4 mr-2" />
                          )}
                          <span>Theme</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
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
  )
}