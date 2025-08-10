import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus, Search, Settings, Bot, Wrench, User } from 'lucide-react'
import { CreateProjectDialog } from '../dialogs/CreateProjectDialog'
import { GlobalSearchDialog } from '../dialogs/GlobalSearchDialog'
import { useGlobalSearchShortcut } from '@/hooks/useKeyboardShortcuts'
import { useProjectSubscriptions } from '@/hooks/useProjectSubscriptions'
import { useCurrentUserProfile } from '@nostr-dev-kit/ndk-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectsStore } from '@/stores/projects'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

export function MobileProjectsList() {
  const userProfile = useCurrentUserProfile()
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  
  // Initialize project subscriptions
  useProjectSubscriptions()
  
  // Add keyboard shortcut for global search
  useGlobalSearchShortcut(() => setSearchDialogOpen(true))

  // Use the cached arrays from the store to prevent infinite loops
  const projectsWithStatus = useProjectsStore(state => state.projectsWithStatusArray)
  
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
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <header className="flex items-center justify-between border-b bg-background px-4 h-14 shrink-0">
        <h1 className="text-xl font-bold">TENEX</h1>
        
        <div className="flex items-center gap-1">
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={userProfile?.image} />
                  <AvatarFallback>
                    {userProfile?.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
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
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* New Project Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Projects List - Telegram Style */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredProjectsWithStatus.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </div>
          ) : (
            filteredProjectsWithStatus.map(({ project, status }) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                {/* Avatar with online indicator */}
                <div className="relative flex-shrink-0">
                  <ProjectAvatar 
                    project={project}
                    className="h-12 w-12"
                    fallbackClassName="text-base"
                  />
                  {status?.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                
                {/* Project info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{project.title}</h3>
                    {status?.isOnline && (
                      <span className="text-xs text-muted-foreground">online</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {project.description || 'No description'}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <CreateProjectDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
      />
      
      <GlobalSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />
    </div>
  )
}