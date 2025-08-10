import { useState } from 'react'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { NDKAgentDefinition } from '@/lib/ndk-events/NDKAgentDefinition'

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}


export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const { ndk } = useNDK()
  const [isCreating, setIsCreating] = useState(false)
  
  // Agent data
  const [agentData, setAgentData] = useState({
    name: '',
    description: '',
    role: '',
    instructions: '',
    useCriteria: '',
    version: '1.0.0',
  })

  const handleCreate = async () => {
    if (!ndk) {
      toast.error('NDK not initialized')
      return
    }

    if (!agentData.name.trim()) {
      toast.error('Agent name is required')
      return
    }

    if (!agentData.description.trim()) {
      toast.error('Agent description is required')
      return
    }

    setIsCreating(true)
    try {
      const agent = new NDKAgentDefinition(ndk)
      agent.name = agentData.name
      agent.description = agentData.description
      agent.role = agentData.role
      agent.instructions = agentData.instructions
      // Parse use criteria from textarea (split by newlines)
      const criteria = agentData.useCriteria
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      agent.useCriteria = criteria
      agent.version = agentData.version || undefined

      await agent.publish()
      
      toast.success('Agent created successfully!')
      onOpenChange(false)
      
      // Reset form
      setAgentData({
        name: '',
        description: '',
        role: '',
        instructions: '',
        useCriteria: '',
        version: '1.0.0',
      })
    } catch (error) {
      console.error('Failed to create agent:', error)
      toast.error('Failed to create agent')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create an AI assistant to help with your projects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={agentData.name}
                onChange={(e) => setAgentData({ ...agentData, name: e.target.value })}
                placeholder="My AI Assistant"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={agentData.description}
                onChange={(e) => setAgentData({ ...agentData, description: e.target.value })}
                placeholder="Describe what this agent does..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={agentData.role}
                onChange={(e) => setAgentData({ ...agentData, role: e.target.value })}
                placeholder="e.g., assistant, developer, researcher"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={agentData.instructions}
                onChange={(e) => setAgentData({ ...agentData, instructions: e.target.value })}
                placeholder="Specific instructions for this agent..."
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="use-criteria">Use Criteria</Label>
              <Textarea
                id="use-criteria"
                value={agentData.useCriteria}
                onChange={(e) => setAgentData({ ...agentData, useCriteria: e.target.value })}
                placeholder="Enter criteria for when this agent should be used (one per line)..."
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="version">Version (optional)</Label>
              <Input
                id="version"
                value={agentData.version}
                onChange={(e) => setAgentData({ ...agentData, version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Agent'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}