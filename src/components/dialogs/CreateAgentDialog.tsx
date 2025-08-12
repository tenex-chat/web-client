import { useState, useEffect } from 'react'
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
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { NDKAgentDefinition } from '@/lib/ndk-events/NDKAgentDefinition'
import ReactMarkdown from 'react-markdown'

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  forkFromAgent?: NDKAgentDefinition
}

type WizardStep = 'basics' | 'prompt' | 'criteria'

export function CreateAgentDialog({ open, onOpenChange, forkFromAgent }: CreateAgentDialogProps) {
  const { ndk } = useNDK()
  const [isCreating, setIsCreating] = useState(false)
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics')
  
  // Agent data
  const [agentData, setAgentData] = useState({
    name: '',
    description: '',
    role: '',
    instructions: '',
    useCriteria: '',
    version: '1',
  })

  // Load fork data when agent changes
  useEffect(() => {
    if (forkFromAgent) {
      // Parse existing version and bump it
      const existingVersion = parseInt(forkFromAgent.version || '1')
      const newVersion = isNaN(existingVersion) ? 2 : existingVersion + 1
      
      setAgentData({
        name: `${forkFromAgent.name || 'Unnamed'} (Fork)`,
        description: forkFromAgent.description || '',
        role: forkFromAgent.role || '',
        instructions: forkFromAgent.instructions || '',
        useCriteria: forkFromAgent.useCriteria?.join('\n') || '',
        version: String(newVersion),
      })
    } else {
      // Reset form when not forking
      setAgentData({
        name: '',
        description: '',
        role: '',
        instructions: '',
        useCriteria: '',
        version: '1',
      })
    }
    // Reset to first step when dialog opens/closes
    setCurrentStep('basics')
  }, [forkFromAgent, open])

  const handleCreate = async () => {
    if (!ndk) {
      toast.error('NDK not initialized')
      return
    }

    if (!agentData.name.trim()) {
      toast.error('Agent name is required')
      setCurrentStep('basics')
      return
    }

    if (!agentData.description.trim()) {
      toast.error('Agent description is required')
      setCurrentStep('basics')
      return
    }

    setIsCreating(true)
    try {
      // Always create a new agent (forking creates a new event)
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
      
      toast.success(forkFromAgent ? 'Agent definition forked successfully!' : 'Agent definition created successfully!')
      onOpenChange(false)
      
      // Reset form
      setAgentData({
        name: '',
        description: '',
        role: '',
        instructions: '',
        useCriteria: '',
        version: '1',
      })
    } catch (error) {
      console.error('Failed to save agent:', error)
      toast.error(forkFromAgent ? 'Failed to fork agent definition' : 'Failed to create agent definition')
    } finally {
      setIsCreating(false)
    }
  }

  const canGoNext = () => {
    switch (currentStep) {
      case 'basics':
        return agentData.name.trim() && agentData.description.trim()
      case 'prompt':
        return true // Instructions are optional
      case 'criteria':
        return true // Criteria are optional
      default:
        return false
    }
  }

  const goNext = () => {
    if (!canGoNext()) return
    
    switch (currentStep) {
      case 'basics':
        setCurrentStep('prompt')
        break
      case 'prompt':
        setCurrentStep('criteria')
        break
      case 'criteria':
        handleCreate()
        break
    }
  }

  const goBack = () => {
    switch (currentStep) {
      case 'prompt':
        setCurrentStep('basics')
        break
      case 'criteria':
        setCurrentStep('prompt')
        break
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basics':
        return 'Basic Information'
      case 'prompt':
        return 'System Prompt'
      case 'criteria':
        return 'Use Criteria & Version'
      default:
        return ''
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'basics':
        return 'Define the basic properties of your agent definition'
      case 'prompt':
        return 'Write the system prompt that will guide this agent\'s behavior'
      case 'criteria':
        return 'Define when this agent should be used and set version'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {forkFromAgent ? 'Fork Agent Definition' : 'Create Agent Definition'}
          </DialogTitle>
          <DialogDescription>
            {getStepTitle()} - {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === 'basics' && (
            <div className="space-y-4">
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
                <Label htmlFor="role">Role (optional)</Label>
                <Input
                  id="role"
                  value={agentData.role}
                  onChange={(e) => setAgentData({ ...agentData, role: e.target.value })}
                  placeholder="e.g., assistant, developer, researcher"
                />
              </div>
            </div>
          )}

          {currentStep === 'prompt' && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="instructions">System Prompt (optional)</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Write instructions that will guide this agent's behavior. You can use Markdown formatting.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Textarea
                      id="instructions"
                      value={agentData.instructions}
                      onChange={(e) => setAgentData({ ...agentData, instructions: e.target.value })}
                      placeholder="You are a helpful AI assistant that...

## Your responsibilities:
- Help users with...
- Provide accurate...

## Guidelines:
1. Always be...
2. Never..."
                      rows={20}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="text-sm font-medium mb-2">Preview</div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {agentData.instructions ? (
                        <ReactMarkdown>{agentData.instructions}</ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground italic">Your formatted prompt will appear here...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'criteria' && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="use-criteria">Use Criteria (optional)</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Define conditions when this agent should be used. Enter one criterion per line.
                </div>
                <Textarea
                  id="use-criteria"
                  value={agentData.useCriteria}
                  onChange={(e) => setAgentData({ ...agentData, useCriteria: e.target.value })}
                  placeholder="User asks for help with coding
User needs research assistance
Task requires creative writing
Complex problem solving is needed"
                  rows={6}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="version">Version</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Version number for this agent definition (use integers: 1, 2, 3, etc.)
                </div>
                <Input
                  id="version"
                  value={agentData.version}
                  onChange={(e) => setAgentData({ ...agentData, version: e.target.value })}
                  placeholder="1"
                  type="number"
                  min="1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep !== 'basics' && (
              <Button
                variant="outline"
                onClick={goBack}
                disabled={isCreating}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={goNext} 
              disabled={isCreating || !canGoNext()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {forkFromAgent ? 'Forking...' : 'Creating...'}
                </>
              ) : currentStep === 'criteria' ? (
                forkFromAgent ? 'Fork' : 'Create'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}