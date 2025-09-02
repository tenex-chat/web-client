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
          <CardTitle>Project Metadata</CardTitle>
          <CardDescription>
            Additional project information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Tag Count</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {project.tags.length} tags
              </p>
            </div>
            
            <div>
              <Label>Agent Count</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {project.agents.length} agent{project.agents.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {project.sig && (
              <div>
                <Label>Signature</Label>
                <p className="text-sm text-muted-foreground mt-1 font-mono text-xs break-all">
                  {project.sig.slice(0, 20)}...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}