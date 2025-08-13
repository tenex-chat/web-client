import { useState, useMemo } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Plus, Settings, LogOut, Bot, Wrench, User, ChevronDown, Globe, Search } from 'lucide-react'
import { CreateProjectDialog } from '../dialogs/CreateProjectDialog'
import { GlobalSearchDialog } from '../dialogs/GlobalSearchDialog'
import { cn } from '@/lib/utils'
import { useGlobalSearchShortcut } from '@/hooks/useKeyboardShortcuts'
import { useCurrentUserProfile } from '@nostr-dev-kit/ndk-hooks'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/common/SearchBar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectCard } from '../projects/ProjectCard'
import { useProjectsStore } from '@/stores/projects'
import { useGlobalAgents } from '@/stores/agents'
import { useProfile } from '@nostr-dev-kit/ndk-hooks'

interface ProjectsSidebarProps {
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
    <Button
      variant="ghost"
      className="w-full justify-start px-2 py-1.5 h-auto"
      onClick={handleClick}
    >
      <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-xs">
            {displayName[0]?.toUpperCase() || 'A'}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm truncate">{displayName}</span>
      </div>
    </Button>
  )
}

export function ProjectsSidebar({ className, onProjectSelect }: ProjectsSidebarProps) {
  const userProfile = useCurrentUserProfile()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  
  // Add keyboard shortcut for global search
  useGlobalSearchShortcut(() => setSearchDialogOpen(true))

  // Use the cached arrays from the store to prevent infinite loops
  const projectsWithStatus = useProjectsStore(state => state.projectsWithStatusArray)
  const globalAgents = useGlobalAgents()
  
  // Debug logging for global agents
  console.log(`[ProjectsSidebar] Global agents in sidebar:`, globalAgents)
  console.log(`[ProjectsSidebar] Number of global agents: ${globalAgents.length}`)
  
  // Filter and sort projects based on search
  const filteredProjectsWithStatus = useMemo(() => {
    if (!projectsWithStatus || projectsWithStatus.length === 0) {
      return []
    }
    
    return projectsWithStatus
      .filter(({ project }) =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // Online projects come first
        if (a.status?.isOnline !== b.status?.isOnline) {
          return a.status?.isOnline ? -1 : 1
        }
        // Then sort by title
        return a.project.title.localeCompare(b.project.title)
      })
  }, [projectsWithStatus, searchQuery])

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">TENEX</h1>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto p-2 hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.image} />
                    <AvatarFallback>
                      {userProfile?.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
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
              <DropdownMenuItem onClick={() => {}}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search projects..."
          />
          <Button
            variant="outline"
            className="w-full justify-start text-xs"
            onClick={() => setSearchDialogOpen(true)}
          >
            <Search className="h-3 w-3 mr-2" />
            Global Search
            <span className="ml-auto text-muted-foreground">⌘K</span>
          </Button>
        </div>
      </div>

      {/* Projects List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Projects Header with New Project Button */}
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-sm font-medium text-muted-foreground">Projects</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Projects */}
          <div className="space-y-1">
            {filteredProjectsWithStatus.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </div>
            ) : (
              filteredProjectsWithStatus.map(({ project, status }) => {
                const projectIdentifier = project.dTag || project.encode()
                return (
                  <ProjectCard
                    key={projectIdentifier}
                    project={project}
                    isOnline={status?.isOnline || false}
                    isActive={location.pathname.includes(projectIdentifier)}
                    onClick={onProjectSelect}
                  />
                )
              })
            )}
          </div>
          
          {/* Agents */}
          {globalAgents.length > 0 && !searchQuery && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">
                AGENTS
              </h3>
              <div className="space-y-1">
                {globalAgents.map((agent) => (
                  <GlobalAgentItem
                    key={agent.pubkey}
                    pubkey={agent.pubkey}
                    slug={agent.slug}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>


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
    </div>
  )
}