import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NDKProject } from '@/lib/ndk-events/NDKProject'

interface ProjectAdvancedSettingsProps {
  project: NDKProject
}

export function ProjectAdvancedSettings({ project }: ProjectAdvancedSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>
            Configure advanced project options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Project ID</Label>
              <p className="text-sm text-muted-foreground mt-1">{project.id}</p>
            </div>
            
            <div>
              <Label>D-Tag</Label>
              <p className="text-sm text-muted-foreground mt-1">{project.dTag}</p>
            </div>
            
            <div>
              <Label>Created At</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {project.created_at ? new Date(project.created_at * 1000).toLocaleString() : 'Unknown'}
              </p>
            </div>
            
            {project.pubkey && (
              <div>
                <Label>Author</Label>
                <p className="text-sm text-muted-foreground mt-1 font-mono text-xs">
                  {project.pubkey}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Agents</CardTitle>
          <CardDescription>
            {project.agents.length} agent(s) assigned to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.agents.length > 0 ? (
            <div className="space-y-2">
              {project.agents.map((agent, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{agent.ndkAgentEventId}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No agents assigned</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}