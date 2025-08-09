import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { Folder } from 'lucide-react'

export const Route = createFileRoute('/_auth/projects/')({
  component: ProjectsIndexPage,
})

function ProjectsIndexPage() {
  return (
    <AppShell>
      <div className="flex h-full items-center justify-center bg-muted/10">
        <div className="text-center">
          <Folder className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a project</h2>
          <p className="text-muted-foreground">
            Choose a project from the sidebar to get started
          </p>
        </div>
      </div>
    </AppShell>
  )
}