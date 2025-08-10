import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { useEffect, useState } from 'react'
import { useNDK, useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { useProject } from '@/hooks/useProject'
import { ArrowLeft, Camera, Trash2, Save, Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProjectAvatar } from '@/components/ui/project-avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_auth/projects/$projectId/settings')({
  component: ProjectSettingsPage,
})

function ProjectSettingsPage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const { ndk } = useNDK()
  const { project, isLoading } = useProject(projectId)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    picture: '',
    repo: '',
    hashtags: [] as string[],
  })

  // Initialize form data when project loads
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        picture: project.picture || '',
        repo: project.repository || '',
        hashtags: project.hashtags || [],
      })
    }
  }, [project])

  const handleSave = async () => {
    if (!project || !ndk) return

    setIsSaving(true)
    try {
      // Update project with new data
      project.title = formData.title
      project.content = formData.description
      project.picture = formData.picture
      project.repository = formData.repo
      project.hashtags = formData.hashtags

      // Publish the updated project
      await project.publish()
      
      toast.success('Project settings saved successfully')
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save project:', error)
      toast.error('Failed to save project settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!project || !ndk) return

    setIsDeleting(true)
    try {
      // Use NDKEvent's built-in delete() method which adds ["deleted"] tag
      await project.delete()
      
      toast.success('Project deleted successfully')
      
      // Navigate back to projects list
      navigate({ to: '/projects' })
    } catch (error) {
      console.error('Failed to delete project:', error)
      toast.error('Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleHashtagsChange = (value: string) => {
    const hashtags = value.split(',').map(tag => tag.trim()).filter(Boolean)
    handleInputChange('hashtags', hashtags)
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading project settings...</p>
        </div>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </AppShell>
    )
  }


  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
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
            
            {hasChanges && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="danger">Danger Zone</TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Information</CardTitle>
                    <CardDescription>
                      Update your project's basic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                      <ProjectAvatar 
                        project={project} 
                        className="h-24 w-24"
                        fallbackClassName="text-2xl"
                      />
                      <div className="space-y-2">
                        <Label htmlFor="picture">Project Image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="picture"
                            placeholder="https://example.com/image.png"
                            value={formData.picture}
                            onChange={(e) => handleInputChange('picture', e.target.value)}
                            className="max-w-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const url = prompt('Enter image URL:', formData.picture)
                              if (url !== null) {
                                handleInputChange('picture', url)
                              }
                            }}
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Project Name */}
                    <div className="space-y-2">
                      <Label htmlFor="title">Project Name</Label>
                      <Input
                        id="title"
                        placeholder="Enter project name"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="max-w-md"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your project..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Repository URL */}
                    <div className="space-y-2">
                      <Label htmlFor="repo">Repository URL</Label>
                      <Input
                        id="repo"
                        placeholder="https://github.com/username/repo"
                        value={formData.repo}
                        onChange={(e) => handleInputChange('repo', e.target.value)}
                        className="max-w-md"
                      />
                    </div>

                    {/* Hashtags */}
                    <div className="space-y-2">
                      <Label htmlFor="hashtags">Tags</Label>
                      <Input
                        id="hashtags"
                        placeholder="react, typescript, web3 (comma separated)"
                        value={formData.hashtags.join(', ')}
                        onChange={(e) => handleHashtagsChange(e.target.value)}
                        className="max-w-md"
                      />
                      <p className="text-sm text-muted-foreground">
                        Separate tags with commas to help others discover your project
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Advanced Settings */}
              <TabsContent value="advanced" className="space-y-6">
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
                            <span>{agent.name || agent.pubkey}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No agents assigned</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Danger Zone */}
              <TabsContent value="danger" className="space-y-6">
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                      These actions cannot be undone. Please be certain.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Delete Project</h3>
                      <p className="text-sm text-muted-foreground">
                        Once you delete a project, it will be marked as deleted and hidden from your project list.
                        The project data will still exist on the Nostr network but will be filtered out.
                      </p>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={isDeleting}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete Project'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will mark the project "{project.title}" as deleted. 
                              It will be hidden from your project list and cannot be easily recovered.
                              All associated data will remain on the Nostr network but will be filtered out.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Project
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  )
}