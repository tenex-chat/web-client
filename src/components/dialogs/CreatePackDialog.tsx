import { useState, useEffect, useMemo } from 'react';
import { useNDK, useSubscribe } from '@nostr-dev-kit/ndk-hooks';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar } from '@/components/common/SearchBar';
import { Loader2, ChevronLeft, ChevronRight, Package, Bot } from 'lucide-react';
import { NDKAgentDefinitionPack } from '@/lib/ndk-events/NDKAgentDefinitionPack';
import { NDKAgentDefinition } from '@/lib/ndk-events/NDKAgentDefinition';
import { AgentDefinitionCard } from '@/components/agents/AgentDefinitionCard';
import { PackCard } from '@/components/agents/PackCard';
import { type NDKKind } from '@nostr-dev-kit/ndk-hooks';
import { cn } from '@/lib/utils'
import { getRoleColor } from '@/lib/utils/role-colors';

interface CreatePackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forkFromPack?: NDKAgentDefinitionPack;
  editPack?: NDKAgentDefinitionPack;
}

type WizardStep = 'info' | 'agents' | 'preview';

export function CreatePackDialog({ open, onOpenChange, forkFromPack, editPack }: CreatePackDialogProps) {
  const { ndk } = useNDK();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('info');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pack data
  const [packData, setPackData] = useState({
    title: '',
    description: '',
    image: '',
    selectedAgentIds: new Set<string>(),
  });

  // Fetch all agents (kind 4199)
  const { events: rawAgents } = useSubscribe(
    [{ kinds: [NDKAgentDefinition.kind as NDKKind] }]
  );

  // Convert raw events to NDKAgentDefinition instances and filter to latest versions only
  const agents = useMemo(() => {
    const allAgents = (rawAgents || []).map(
      (event) => new NDKAgentDefinition(ndk || undefined, event.rawEvent()),
    );

    // Group agents by slug/d-tag/name to show only latest version
    const agentGroups = new Map<string, NDKAgentDefinition[]>();

    allAgents.forEach((agent) => {
      const identifier = agent.slug || agent.dTag || agent.name || agent.id;
      const groupKey = identifier;

      if (!agentGroups.has(groupKey)) {
        agentGroups.set(groupKey, []);
      }
      agentGroups.get(groupKey)!.push(agent);
    });

    // For each group, keep only the latest version
    const latestAgents: NDKAgentDefinition[] = [];

    agentGroups.forEach((groupAgents) => {
      if (groupAgents.length === 1) {
        latestAgents.push(groupAgents[0]);
      } else {
        const sorted = groupAgents.sort((a, b) => {
          const timeA = a.created_at || 0;
          const timeB = b.created_at || 0;
          if (timeA !== timeB) {
            return timeB - timeA;
          }
          const versionA = parseInt(a.version || "0");
          const versionB = parseInt(b.version || "0");
          return versionB - versionA;
        });
        latestAgents.push(sorted[0]);
      }
    });

    return latestAgents;
  }, [rawAgents, ndk]);

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    
    const query = searchQuery.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.name?.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.role?.toLowerCase().includes(query),
    );
  }, [agents, searchQuery]);

  // Load fork/edit data when pack changes
  useEffect(() => {
    if (forkFromPack) {
      setPackData({
        title: `${forkFromPack.title || 'Untitled'} (Fork)`,
        description: forkFromPack.description || '',
        image: forkFromPack.image || '',
        selectedAgentIds: new Set(forkFromPack.agentEventIds),
      });
    } else if (editPack) {
      setPackData({
        title: editPack.title || '',
        description: editPack.description || '',
        image: editPack.image || '',
        selectedAgentIds: new Set(editPack.agentEventIds),
      });
    } else {
      // Reset form when not forking or editing
      setPackData({
        title: '',
        description: '',
        image: '',
        selectedAgentIds: new Set(),
      });
    }
    // Reset to first step when dialog opens/closes
    setCurrentStep('info');
    setSearchQuery('');
  }, [forkFromPack, editPack, open]);

  const handleCreate = async () => {
    if (!ndk) {
      toast.error('NDK not initialized');
      return;
    }

    if (!packData.title.trim()) {
      toast.error('Pack title is required');
      setCurrentStep('info');
      return;
    }

    if (packData.selectedAgentIds.size === 0) {
      toast.error('Please select at least one agent for the pack');
      setCurrentStep('agents');
      return;
    }

    setIsCreating(true);
    try {
      let pack: NDKAgentDefinitionPack;
      
      if (editPack) {
        // When editing, use the existing pack instance
        pack = editPack;
        pack.title = packData.title;
        pack.description = packData.description;
        pack.image = packData.image || undefined;
        
        // Clear existing agent tags
        pack.tags = pack.tags.filter(tag => tag[0] !== 'e' || tag[3] !== 'agent');
        
        // Add selected agents
        packData.selectedAgentIds.forEach(agentId => {
          const agent = agents.find(a => a.id === agentId);
          if (agent) {
            pack.addAgent(agent);
          }
        });
      } else {
        // Creating new or forking
        pack = new NDKAgentDefinitionPack(ndk);
        pack.title = packData.title;
        pack.description = packData.description;
        pack.image = packData.image || undefined;
        
        // Add selected agents to the pack
        packData.selectedAgentIds.forEach(agentId => {
          const agent = agents.find(a => a.id === agentId);
          if (agent) {
            pack.addAgent(agent);
          }
        });

        // If forking, add an "e" tag to reference the previous pack
        if (forkFromPack) {
          pack.tags.push(['e', forkFromPack.id]);
        }
      }

      await pack.publishReplaceable();
      
      const message = editPack ? 'Pack updated successfully!' : 
                     forkFromPack ? 'Pack forked successfully!' : 
                     'Pack created successfully!';
      toast.success(message);
      onOpenChange(false);
      
      // Reset form
      setPackData({
        title: '',
        description: '',
        image: '',
        selectedAgentIds: new Set(),
      });
    } catch (error) {
      console.error('Failed to save pack:', error);
      const errorMessage = editPack ? 'Failed to update pack' : 
                          forkFromPack ? 'Failed to fork pack' : 
                          'Failed to create pack';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    const newSelection = new Set(packData.selectedAgentIds);
    if (newSelection.has(agentId)) {
      newSelection.delete(agentId);
    } else {
      newSelection.add(agentId);
    }
    setPackData({ ...packData, selectedAgentIds: newSelection });
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 'info':
        return packData.title.trim().length > 0;
      case 'agents':
        return packData.selectedAgentIds.size > 0;
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!canGoNext()) return;
    
    switch (currentStep) {
      case 'info':
        setCurrentStep('agents');
        break;
      case 'agents':
        setCurrentStep('preview');
        break;
      case 'preview':
        handleCreate();
        break;
    }
  };

  const goBack = () => {
    switch (currentStep) {
      case 'agents':
        setCurrentStep('info');
        break;
      case 'preview':
        setCurrentStep('agents');
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'info':
        return 'Pack Information';
      case 'agents':
        return 'Select Agents';
      case 'preview':
        return 'Review Pack';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'info':
        return 'Define the basic properties of your agent pack';
      case 'agents':
        return 'Choose which agent definitions to include in this pack';
      case 'preview':
        return 'Review your pack before publishing';
      default:
        return '';
    }
  };

  const getDialogWidth = () => {
    switch (currentStep) {
      case 'agents':
        return 'max-w-5xl';
      case 'preview':
        return 'max-w-3xl';
      default:
        return 'max-w-2xl';
    }
  };


  // Create a temporary pack for preview
  const previewPack = useMemo(() => {
    if (currentStep !== 'preview') return null;
    
    const pack = new NDKAgentDefinitionPack(ndk);
    pack.title = packData.title;
    pack.description = packData.description;
    pack.image = packData.image || undefined;
    // Set a temporary ID for color generation
    pack.id = `preview-${packData.title}`;
    
    // Add agent IDs for count
    packData.selectedAgentIds.forEach(agentId => {
      pack.tags.push(['e', agentId]);
    });
    
    return pack;
  }, [currentStep, packData, ndk]);

  // Get selected agents for preview
  const selectedAgents = useMemo(() => {
    return agents.filter(agent => packData.selectedAgentIds.has(agent.id || ''));
  }, [agents, packData.selectedAgentIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${getDialogWidth()} max-h-[90vh] flex flex-col`}>
        <DialogHeader>
          <DialogTitle>
            {editPack ? 'Edit Agent Pack' : forkFromPack ? 'Fork Agent Pack' : 'Create Agent Pack'}
          </DialogTitle>
          <DialogDescription>
            {getStepTitle()} - {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === 'info' && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={packData.title}
                  onChange={(e) => setPackData({ ...packData, title: e.target.value })}
                  placeholder="My Agent Pack"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={packData.description}
                  onChange={(e) => setPackData({ ...packData, description: e.target.value })}
                  placeholder="Describe what this pack is for..."
                  rows={4}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="image">Image URL (optional)</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Provide an image URL for the pack cover. If not provided, a color will be generated.
                </div>
                <Input
                  id="image"
                  type="url"
                  value={packData.image}
                  onChange={(e) => setPackData({ ...packData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          )}

          {currentStep === 'agents' && (
            <div className="space-y-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search agents by name, description, or role..."
              />
              
              <div className="text-sm text-muted-foreground">
                {packData.selectedAgentIds.size} agent{packData.selectedAgentIds.size !== 1 ? 's' : ''} selected
              </div>

              <ScrollArea className="h-[400px]">
                <div className="grid gap-4 md:grid-cols-2 pr-4">
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={cn(
                        "relative rounded-lg transition-all cursor-pointer",
                        packData.selectedAgentIds.has(agent.id || '') && "ring-2 ring-primary"
                      )}
                      onClick={() => toggleAgentSelection(agent.id || '')}
                    >
                      <AgentDefinitionCard
                        agent={agent}
                      />
                      {packData.selectedAgentIds.has(agent.id || '') && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-primary-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {currentStep === 'preview' && previewPack && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Pack Preview</h3>
                <div className="flex justify-center">
                  <PackCard pack={previewPack} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">
                  Included Agents ({selectedAgents.length})
                </h3>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4">
                    {selectedAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Bot className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{agent.name || 'Unnamed'}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {agent.description || 'No description'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep !== 'info' && (
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
                  {editPack ? 'Updating...' : forkFromPack ? 'Forking...' : 'Creating...'}
                </>
              ) : currentStep === 'preview' ? (
                editPack ? 'Update' : forkFromPack ? 'Fork' : 'Create'
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
  );
}