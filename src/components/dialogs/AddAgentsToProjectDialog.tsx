import { useState } from 'react';
import { useNDK } from '@nostr-dev-kit/ndk-hooks';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { NDKAgentDefinition } from '@/lib/ndk-events/NDKAgentDefinition';
import { NDKProject } from '@/lib/ndk-events/NDKProject';
import { AgentSelector } from '@/components/agents/AgentSelector';

interface AddAgentsToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: NDKProject;
  existingAgentIds?: string[];
}

export function AddAgentsToProjectDialog({ 
  open, 
  onOpenChange, 
  project,
  existingAgentIds = []
}: AddAgentsToProjectDialogProps) {
  const { ndk } = useNDK();
  const [selectedAgents, setSelectedAgents] = useState<NDKAgentDefinition[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddAgents = async () => {
    if (!ndk || selectedAgents.length === 0) return;

    setIsAdding(true);
    try {
      // Add each selected agent to the project
      selectedAgents.forEach(agent => {
        if (agent.id && !existingAgentIds.includes(agent.id)) {
          project.addAgent(agent.id);
        }
      });

      // Publish the updated project event
      await project.publish();
      
      toast.success(`Added ${selectedAgents.length} agent${selectedAgents.length > 1 ? 's' : ''} to the project`);
      
      // Reset and close
      setSelectedAgents([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add agents to project:', error);
      toast.error('Failed to add agents to project');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Agents to Project</DialogTitle>
          <DialogDescription>
            Select agents to add to {project.title || 'this project'}. 
            These agents will be available for use in this project's context.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <AgentSelector
            selectedAgents={selectedAgents}
            onAgentsChange={setSelectedAgents}
            filterType="agent"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddAgents}
            disabled={isAdding || selectedAgents.length === 0}
          >
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add {selectedAgents.length > 0 ? `${selectedAgents.length} ` : ''}Agent{selectedAgents.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}