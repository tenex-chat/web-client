import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useProject } from '@/hooks/useProject'
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectGeneralSettings } from '@/components/settings/ProjectGeneralSettings'
import { ProjectAdvancedSettings } from '@/components/settings/ProjectAdvancedSettings'
import { ProjectDangerZone } from '@/components/settings/ProjectDangerZone'
import { ProjectAgentsPanel } from '@/components/projects/ProjectAgentsPanel'

export const Route = createFileRoute('/_auth/projects/$projectId/settings')({
  component: ProjectSettingsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || 'general'
    }
  }
})

function ProjectSettingsPage() {
  const { projectId } = Route.useParams()
  const { tab } = Route.useSearch()
  const navigate = useNavigate()
  const project = useProject(projectId)

  const handleDelete = () => {
    navigate({ to: '/projects' })
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: '/projects/$projectId', params: { projectId } })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-bold">Project Settings</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <Tabs value={tab} className="space-y-6">
              <TabsList>
                <TabsTrigger 
                  value="general"
                  onClick={() => navigate({ to: '/projects/$projectId/settings', params: { projectId }, search: { tab: 'general' } })}
                >
                  General
                </TabsTrigger>
                <TabsTrigger 
                  value="agents"
                  onClick={() => navigate({ to: '/projects/$projectId/settings', params: { projectId }, search: { tab: 'agents' } })}
                >
                  Agents
                </TabsTrigger>
                <TabsTrigger 
                  value="advanced"
                  onClick={() => navigate({ to: '/projects/$projectId/settings', params: { projectId }, search: { tab: 'advanced' } })}
                >
                  Advanced
                </TabsTrigger>
                <TabsTrigger 
                  value="danger"
                  onClick={() => navigate({ to: '/projects/$projectId/settings', params: { projectId }, search: { tab: 'danger' } })}
                >
                  Danger Zone
                </TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general">
                <ProjectGeneralSettings project={project} />
              </TabsContent>

              {/* Agents */}
              <TabsContent value="agents">
                <ProjectAgentsPanel project={project} />
              </TabsContent>

              {/* Advanced Settings */}
              <TabsContent value="advanced">
                <ProjectAdvancedSettings project={project} />
              </TabsContent>

              {/* Danger Zone */}
              <TabsContent value="danger">
                <ProjectDangerZone project={project} onDelete={handleDelete} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
  )
}