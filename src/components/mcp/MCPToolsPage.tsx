import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useNDK, useSubscribe, useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { NDKKind } from '@nostr-dev-kit/ndk-hooks'
import { NDKMCPTool } from '@/lib/ndk-events/NDKMCPTool'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Copy,
  Terminal,
  Code2,
  Wrench,
  Save,
  X,
  Loader2
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function MCPToolsPage() {
  const navigate = useNavigate()
  const { ndk } = useNDK()
  const user = useNDKCurrentUser()
  const [selectedTool, setSelectedTool] = useState<NDKMCPTool | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toolToDelete, setToolToDelete] = useState<NDKMCPTool | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    command: '',
    parameters: {} as Record<string, unknown>,
    capabilities: [] as string[]
  })

  // Subscribe to MCP tools
  const { events } = useSubscribe(
    [{ kinds: [4200 as NDKKind], limit: 100 }],
    { closeOnEose: false }
  )

  const tools = events?.map(event => {
    const tool = new NDKMCPTool(event.ndk, event.rawEvent())
    return tool
  }) || []

  // Group tools by ownership
  const myTools = tools.filter(tool => tool.pubkey === user?.pubkey)

  const handleCreateNew = () => {
    setSelectedTool(null)
    setIsCreating(true)
    setIsEditing(true)
    setFormData({
      name: '',
      description: '',
      command: '',
      parameters: {},
      capabilities: []
    })
  }

  const handleEdit = (tool: NDKMCPTool) => {
    setSelectedTool(tool)
    setIsEditing(true)
    setIsCreating(false)
    setFormData({
      name: tool.name || '',
      description: tool.description || '',
      command: tool.command || '',
      parameters: tool.parameters || {},
      capabilities: tool.capabilities || []
    })
  }

  const handleSave = async () => {
    if (!ndk || !user) {
      toast.error('Not authenticated')
      return
    }

    if (!formData.name || !formData.command) {
      toast.error('Name and command are required')
      return
    }

    setIsSaving(true)
    try {
      const tool = selectedTool || new NDKMCPTool(ndk)
      
      tool.name = formData.name
      tool.description = formData.description
      tool.command = formData.command
      tool.parameters = formData.parameters
      tool.capabilities = formData.capabilities

      await tool.publish()
      
      toast.success(isCreating ? 'Tool created successfully' : 'Tool updated successfully')
      setIsEditing(false)
      setIsCreating(false)
      setSelectedTool(tool)
    } catch (error) {
      console.error('Failed to save tool:', error)
      toast.error('Failed to save tool')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!toolToDelete || !ndk || !user) return

    try {
      // Create a deletion event (kind 5)
      const deleteEvent = await toolToDelete.delete()
      if (deleteEvent) {
        await deleteEvent.publish()
      }
      
      toast.success('Tool deleted successfully')
      setDeleteDialogOpen(false)
      setToolToDelete(null)
      if (selectedTool?.id === toolToDelete.id) {
        setSelectedTool(null)
      }
    } catch (error) {
      console.error('Failed to delete tool:', error)
      toast.error('Failed to delete tool')
    }
  }

  const handleCopyId = (tool: NDKMCPTool) => {
    navigator.clipboard.writeText(tool.id)
    toast.success('Tool ID copied to clipboard')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsCreating(false)
    if (!selectedTool) {
      setFormData({
        name: '',
        description: '',
        command: '',
        parameters: {},
        capabilities: []
      })
    }
  }

  const addCapability = () => {
    const cap = prompt('Enter capability:')
    if (cap && !formData.capabilities.includes(cap)) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, cap]
      }))
    }
  }

  const removeCapability = (cap: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(c => c !== cap)
    }))
  }

  const getToolIcon = (command?: string) => {
    if (!command) return <Wrench className="h-5 w-5" />
    if (command.includes('mcp')) return <Terminal className="h-5 w-5" />
    if (command.includes('code')) return <Code2 className="h-5 w-5" />
    return <Wrench className="h-5 w-5" />
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/projects' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">MCP Tools</h1>
            <p className="text-muted-foreground">
              Manage Model Context Protocol tools for your projects
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Tool
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tools List */}
        <div className="lg:col-span-1">
          <Tabs defaultValue="my" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="my" className="flex-1">
                My Tools ({myTools.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1">
                All Tools ({tools.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="my">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {myTools.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">No tools created yet</p>
                        <Button 
                          variant="link" 
                          onClick={handleCreateNew}
                          className="mt-2"
                        >
                          Create your first tool
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    myTools.map(tool => (
                      <Card
                        key={tool.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTool?.id === tool.id ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedTool(tool)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getToolIcon(tool.command)}
                              <CardTitle className="text-base">
                                {tool.name || 'Unnamed Tool'}
                              </CardTitle>
                            </div>
                          </div>
                          <CardDescription className="text-xs line-clamp-2">
                            {tool.description || 'No description'}
                          </CardDescription>
                          {tool.command && (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {tool.command}
                            </code>
                          )}
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {tools.map(tool => (
                    <Card
                      key={tool.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTool?.id === tool.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setSelectedTool(tool)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getToolIcon(tool.command)}
                            <CardTitle className="text-base">
                              {tool.name || 'Unnamed Tool'}
                            </CardTitle>
                          </div>
                          {tool.pubkey === user?.pubkey && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs line-clamp-2">
                          {tool.description || 'No description'}
                        </CardDescription>
                        {tool.command && (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {tool.command}
                          </code>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Tool Details/Edit */}
        <div className="lg:col-span-2">
          {isEditing || isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {isCreating ? 'Create New Tool' : 'Edit Tool'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My MCP Tool"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this tool does..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="command">Command</Label>
                  <Input
                    id="command"
                    value={formData.command}
                    onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                    placeholder="mcp-server-tool"
                    className="font-mono"
                  />
                </div>


                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Capabilities</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCapability}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.capabilities.map((cap, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeCapability(cap)}
                      >
                        {cap}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                    {formData.capabilities.length === 0 && (
                      <p className="text-sm text-muted-foreground">No capabilities added</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedTool ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getToolIcon(selectedTool.command)}
                      <CardTitle>{selectedTool.name || 'Unnamed Tool'}</CardTitle>
                    </div>
                    <CardDescription>
                      {selectedTool.description || 'No description available'}
                    </CardDescription>
                  </div>
                  {selectedTool.pubkey === user?.pubkey && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(selectedTool)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setToolToDelete(selectedTool)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTool.command && (
                  <div>
                    <Label className="text-sm">Command</Label>
                    <code className="block mt-1 p-2 bg-muted rounded text-sm">
                      {selectedTool.command}
                    </code>
                  </div>
                )}

                {selectedTool.capabilities && selectedTool.capabilities.length > 0 && (
                  <div>
                    <Label className="text-sm">Capabilities</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTool.capabilities.map((cap, index) => (
                        <Badge key={index} variant="secondary">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm">Tool ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-xs truncate">
                      {selectedTool.id}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyId(selectedTool)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No tool selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a tool from the list or create a new one
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Tool
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tool "{toolToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}