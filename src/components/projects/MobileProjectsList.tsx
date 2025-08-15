import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus, Settings, Bot, Wrench, User, WifiOff } from 'lucide-react'
import { SearchBar } from '@/components/common/SearchBar'
import { CreateProjectDialog } from '../dialogs/CreateProjectDialog'
import { GlobalSearchDialog } from '../dialogs/GlobalSearchDialog'
import { useGlobalSearchShortcut } from '@/hooks/useKeyboardShortcuts'
import { useSortedProjects } from '@/hooks/useSortedProjects'
import { useCurrentUserProfile, useNDK } from '@nostr-dev-kit/ndk-hooks'
import { Button } from '@/components/ui/button'
import { bringProjectOnline } from '@/lib/utils/projectStatusUtils'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FAB } from '@/components/ui/fab'

export function MobileProjectsList() {
  const userProfile = useCurrentUserProfile()
  const { ndk } = useNDK()
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  
  // Add keyboard shortcut for global search
  useGlobalSearchShortcut(() => setSearchDialogOpen(true))

  // Use the sorted projects hook for consistent ordering
  const sortedProjects = useSortedProjects()
  
  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!sortedProjects || sortedProjects.length === 0) {
      return []
    }
    
    if (!searchQuery) {
      return sortedProjects
    }
    
    return sortedProjects.filter(({ project }) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [sortedProjects, searchQuery])

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
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search projects..."
        />
      </div>

      {/* Projects List - Telegram Style */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </div>
          ) : (
            filteredProjects.map(({ project, status }) => {
              const projectIdentifier = project.dTag || project.encode()
              return (
                <Link
                  key={projectIdentifier}
                  to="/projects/$projectId"
                  params={{ projectId: projectIdentifier }}
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
                    <h3 className="font-semibold truncate flex items-center gap-1.5">
                      {project.title}
                      {status && !status.isOnline && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!ndk) {
                              toast.error('NDK not initialized')
                              return
                            }
                            await bringProjectOnline(project, ndk)
                          }}
                        >
                          <WifiOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </Button>
                      )}
                    </h3>
                    {status?.isOnline && (
                      <span className="text-xs text-muted-foreground">online</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {project.description || 'No description'}
                  </p>
                </div>
              </Link>
              )
            })
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
      
      {/* FAB for creating new project */}
      <FAB
        onClick={() => setCreateDialogOpen(true)}
        label="New Project"
        showLabel={false}
        position="bottom-right"
        size="default"
      >
        <Plus />
      </FAB>
    </div>
  )
}