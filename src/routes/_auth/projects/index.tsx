import { createFileRoute } from '@tanstack/react-router'
import { MobileProjectsList } from '@/components/projects/MobileProjectsList'
import { Folder } from 'lucide-react'
import { useIsMobile } from '@/hooks/useMediaQuery'

export const Route = createFileRoute('/_auth/projects/')({
  component: ProjectsIndexPage,
})

function ProjectsIndexPage() {
  const isMobile = useIsMobile()
  
  // On mobile, show the Telegram-style projects list
  if (isMobile) {
    return <MobileProjectsList />
  }
  
  // On desktop, show the empty state (projects are in sidebar)
  return (
    <div className="flex h-full items-center justify-center bg-muted/10">
      <div className="text-center">
        <Folder className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Select a project</h2>
        <p className="text-muted-foreground">
          Choose a project from the sidebar to get started
        </p>
      </div>
    </div>
  )
}