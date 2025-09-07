import { useState, useEffect, useCallback, memo } from "react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { ProjectAgent } from "@/lib/ndk-events/NDKProjectStatus";
import { Volume2, Save, Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAgentVoiceConfig } from "@/hooks/useAgentVoiceConfig";
import { useProjectStatusMap, useProjectsArray } from "@/stores/projects";
import { useProjectOnlineModels } from "@/hooks/useProjectOnlineModels";
import { useProjectAvailableTools } from "@/hooks/useProjectAvailableTools";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useNDK, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

interface AgentSettingsTabProps {
  agent?: NDKAgentDefinition;
  agentSlug: string; // This is actually the agent's pubkey for profile pages
}

interface ProjectAgentSettings {
  projectDTag: string;
  projectTitle: string;
  selectedModel: string;
  selectedTools: Set<string>;
  originalModel?: string;
  originalTools?: string[];
}

interface ProjectSettingsCardProps {
  project: NDKProject;
  settings: ProjectAgentSettings;
  onModelChange: (projectDTag: string, model: string) => void;
  onToolToggle: (projectDTag: string, tool: string) => void;
}

const ProjectSettingsCard = memo(function ProjectSettingsCard({ project, settings, onModelChange, onToolToggle }: ProjectSettingsCardProps) {
  const models = useProjectOnlineModels(project.dTag);
  const tools = useProjectAvailableTools(project.dTag);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{settings.projectTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <Label>Model</Label>
          <Select
            value={settings.selectedModel}
            onValueChange={(value) => onModelChange(settings.projectDTag, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map(model => (
                <SelectItem key={model.model} value={model.model}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Tools Selection */}
        <div className="space-y-2">
          <Label>Tools</Label>
          <div className="space-y-2">
            {tools.map(tool => (
              <div key={tool} className="flex items-center space-x-2">
                <Checkbox
                  id={`${project.dTag}-${tool}`}
                  checked={settings.selectedTools.has(tool)}
                  onCheckedChange={() => onToolToggle(settings.projectDTag, tool)}
                />
                <label
                  htmlFor={`${project.dTag}-${tool}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {tool}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export function AgentSettingsTab({ agentSlug }: AgentSettingsTabProps) {
  const [projectSettings, setProjectSettings] = useState<Map<string, ProjectAgentSettings>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const projectStatusMap = useProjectStatusMap();
  const projects = useProjectsArray();
  
  // Use the agent's pubkey for voice config
  const agentPubkey = agentSlug; // agentSlug is actually the pubkey in profile pages
  const {
    config: voiceConfig,
    availableVoices,
    loadingVoices,
    saveConfig: saveVoiceConfig,
    removeConfig: removeVoiceConfig,
    testVoice,
    hasCustomConfig
  } = useAgentVoiceConfig(agentPubkey);

  // Filter projects where this agent is assigned
  const agentProjects = projects.filter(project => {
    const agentIds = project.agents?.map(a => a.ndkAgentEventId) || [];
    return agentIds.some(() => {
      const status = projectStatusMap.get(project.dTag || '');
      return status?.agents?.some((as: ProjectAgent) => as.pubkey === agentPubkey);
    });
  });

  // Initialize project settings
  useEffect(() => {
    const newSettings = new Map<string, ProjectAgentSettings>();
    
    agentProjects.forEach(project => {
      const projectStatus = projectStatusMap.get(project.dTag || '');
      const agentStatus = projectStatus?.agents?.find((as: ProjectAgent) => as.pubkey === agentPubkey);
      
      if (projectStatus && agentStatus) {
        newSettings.set(project.dTag || '', {
          projectDTag: project.dTag || '',
          projectTitle: project.title || 'Untitled',
          selectedModel: agentStatus.modelOverride || agentStatus.model || '',
          selectedTools: new Set(agentStatus.toolOverrides || agentStatus.tools || []),
          originalModel: agentStatus.model,
          originalTools: agentStatus.tools,
        });
      }
    });
    
    setProjectSettings(newSettings);
  }, [agentProjects, projectStatusMap, agentPubkey]);

  const handleVoiceChange = useCallback((voiceId: string) => {
    saveVoiceConfig({ voiceId });
  }, [saveVoiceConfig]);

  const handleSpeedChange = useCallback((speed: number[]) => {
    saveVoiceConfig({ speed: speed[0] });
  }, [saveVoiceConfig]);

  const handleProviderChange = useCallback((provider: 'openai' | 'elevenlabs') => {
    saveVoiceConfig({ provider });
  }, [saveVoiceConfig]);

  const handleTestVoice = async () => {
    try {
      await testVoice();
      toast.success('Voice test successful');
    } catch {
      toast.error('Failed to test voice');
    }
  };

  const handleResetVoice = () => {
    removeVoiceConfig();
    toast.success('Reset to global voice settings');
  };

  const handleModelChange = useCallback((projectDTag: string, model: string) => {
    setProjectSettings(prev => {
      const newSettings = new Map(prev);
      const settings = newSettings.get(projectDTag);
      if (settings) {
        settings.selectedModel = model;
      }
      return newSettings;
    });
  }, []);

  const handleToolToggle = useCallback((projectDTag: string, tool: string) => {
    setProjectSettings(prev => {
      const newSettings = new Map(prev);
      const settings = newSettings.get(projectDTag);
      if (settings) {
        const newTools = new Set(settings.selectedTools);
        if (newTools.has(tool)) {
          newTools.delete(tool);
        } else {
          newTools.add(tool);
        }
        settings.selectedTools = newTools;
      }
      return newSettings;
    });
  }, []);

  const handleSaveProjectSettings = async () => {
    if (!ndk || !user) {
      toast.error("Not connected");
      return;
    }

    setIsSaving(true);
    
    try {
      for (const [projectDTag, settings] of projectSettings) {
        const hasChanges = 
          settings.selectedModel !== settings.originalModel ||
          JSON.stringify(Array.from(settings.selectedTools)) !== JSON.stringify(settings.originalTools || []);
        
        if (!hasChanges) continue;

        const overrideEvent = new NDKEvent(ndk);
        overrideEvent.kind = 12111; // Agent override event
        overrideEvent.tags = [
          ["d", projectDTag],
          ["agent", agentPubkey],
        ];

        if (settings.selectedModel !== settings.originalModel) {
          overrideEvent.tags.push(["model", settings.selectedModel]);
        }

        const toolsArray = Array.from(settings.selectedTools);
        if (JSON.stringify(toolsArray) !== JSON.stringify(settings.originalTools || [])) {
          toolsArray.forEach(tool => {
            overrideEvent.tags.push(["tool", tool]);
          });
        }

        await overrideEvent.publish();
      }

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Settings
          </CardTitle>
          <CardDescription>
            Configure the voice for this agent
            {hasCustomConfig && (
              <Badge variant="secondary" className="ml-2">Custom</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voice Provider */}
          <div className="space-y-2">
            <Label>Voice Provider</Label>
            <Select 
              value={voiceConfig.provider} 
              onValueChange={(value) => handleProviderChange(value as 'openai' | 'elevenlabs')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <Label>Voice</Label>
            <Select 
              value={voiceConfig.voiceId} 
              onValueChange={handleVoiceChange}
              disabled={loadingVoices}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingVoices ? "Loading voices..." : "Select a voice"} />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map(voice => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex flex-col">
                      <span>{voice.name}</span>
                      {voice.description && (
                        <span className="text-xs text-muted-foreground">{voice.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
            <Label>Speed: {voiceConfig.speed}x</Label>
            <Slider
              value={[voiceConfig.speed || 1.0]}
              onValueChange={handleSpeedChange}
              min={0.5}
              max={2}
              step={0.1}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestVoice}
              disabled={!voiceConfig.apiKey || !voiceConfig.voiceId}
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Test Voice
            </Button>
            {hasCustomConfig && (
              <Button
                variant="outline"
                onClick={handleResetVoice}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Global
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project-specific Settings */}
      {agentProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Project Settings
            </CardTitle>
            <CardDescription>
              Configure this agent's models and tools per project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {agentProjects.map(project => {
                  const settings = projectSettings.get(project.dTag || '');
                  
                  if (!settings) return null;
                  
                  return (
                    <ProjectSettingsCard
                      key={project.dTag}
                      project={project}
                      settings={settings}
                      onModelChange={handleModelChange}
                      onToolToggle={handleToolToggle}
                    />
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="mt-4">
              <Button onClick={handleSaveProjectSettings} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Project Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}