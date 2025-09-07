import { createFileRoute } from '@tanstack/react-router'
import { MobileProjectsList } from '@/components/projects/MobileProjectsList'
import { Folder } from 'lucide-react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MultiProjectView } from '@/components/layout/MultiProjectView'
import { useAtom } from 'jotai'
import { openProjectsAtom, openProjectIdsAtom } from '@/stores/openProjects'
import { useRestoreOpenProjects } from '@/hooks/useRestoreOpenProjects'
import { useProjectsArray } from '@/stores/projects'

export const Route = createFileRoute('/_auth/projects/')({
  component: ProjectsIndexPage,
})

function ProjectsIndexPage() {
  const isMobile = useIsMobile()
  const [openProjects] = useAtom(openProjectsAtom)
  const [openProjectIds] = useAtom(openProjectIdsAtom)
  const projects = useProjectsArray()
  
  // Restore open projects from localStorage when projects load
  useRestoreOpenProjects()
  
  // On mobile, show the Telegram-style projects list
  if (isMobile) {
    return <MobileProjectsList />
  }
  
  // Check if we have projects to open but they're not loaded yet
  const hasStoredProjects = openProjectIds.length > 0
  const projectsLoaded = projects.length > 0
  const waitingForProjects = hasStoredProjects && !projectsLoaded
  
  // Show loading state if we're waiting for projects to load
  if (waitingForProjects) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/10">
        <div className="text-center">
          <Folder className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold mb-2">Loading projects...</h2>
        </div>
      </div>
    )
  }
  
  // On desktop, show the multi-column view if projects are open
  if (openProjects.length > 0) {
    return <MultiProjectView openProjects={openProjects} />
  }
  
  // On desktop with no projects open, show the empty state
  return (
    <div className="flex h-full items-center justify-center bg-muted/10">
      <div className="text-center">
        <Folder className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Select projects to view</h2>
        <p className="text-muted-foreground">
          Click projects in the sidebar to open them in columns
        </p>
      </div>
    </div>
  )
}