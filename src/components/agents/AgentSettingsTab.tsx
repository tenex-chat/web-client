import { useState, useEffect, useMemo } from "react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { Volume2, Save, Bot, Settings2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAgentVoiceConfig, saveAgentVoiceConfig } from "@/lib/voice-config";
import { VoiceSelector } from "@/components/voice/VoiceSelector";
import { useMurfVoices, getVoiceInfo } from "@/hooks/useMurfVoices";
import { useTTS } from "@/stores/ai-config-store";
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
import { useNDK, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk";

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

export function AgentSettingsTab({ agentSlug }: AgentSettingsTabProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [projectSettings, setProjectSettings] = useState<Map<string, ProjectAgentSettings>>(new Map());
  const { config: ttsConfig } = useTTS();
  const apiKey = ttsConfig?.apiKey;
  const { voices } = useMurfVoices(apiKey);
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const projectStatusMap = useProjectStatusMap();
  const projects = useProjectsArray();

  // Find all projects where this agent is active
  const agentProjects = useMemo(() => {
    const agentProjectsList: Array<{ dTag: string; title: string; agent: any }> = [];
    
    projectStatusMap.forEach((status, dTag) => {
      const agent = status.agents.find(a => a.pubkey === agentSlug);
      if (agent) {
        // Get project title from the projects store
        const project = projects.find(p => p.dTag === dTag);
        const projectTitle = project?.title || dTag;
        agentProjectsList.push({ dTag, title: projectTitle, agent });
      }
    });
    
    return agentProjectsList;
  }, [projectStatusMap, agentSlug, projects]);

  // Load saved voice configuration and initialize project settings on mount
  useEffect(() => {
    if (agentSlug) {
      const config = getAgentVoiceConfig(agentSlug);
      if (config?.voiceId) {
        setSelectedVoice(config.voiceId);
      }
    }

    // Initialize project settings for each project where the agent is active
    const initialSettings = new Map<string, ProjectAgentSettings>();
    agentProjects.forEach(({ dTag, title, agent }) => {
      initialSettings.set(dTag, {
        projectDTag: dTag,
        projectTitle: title,
        selectedModel: agent.model || "",
        selectedTools: new Set(agent.tools || []),
        originalModel: agent.model,
        originalTools: agent.tools,
      });
    });
    setProjectSettings(initialSettings);
  }, [agentSlug, agentProjects]);

  const handleProjectModelChange = (projectDTag: string, model: string) => {
    setProjectSettings((prev) => {
      const updated = new Map(prev);
      const settings = updated.get(projectDTag);
      if (settings) {
        settings.selectedModel = model;
      }
      return updated;
    });
  };

  const handleProjectToolToggle = (projectDTag: string, tool: string) => {
    setProjectSettings((prev) => {
      const updated = new Map(prev);
      const settings = updated.get(projectDTag);
      if (settings) {
        const newTools = new Set(settings.selectedTools);
        if (newTools.has(tool)) {
          newTools.delete(tool);
        } else {
          newTools.add(tool);
        }
        settings.selectedTools = newTools;
      }
      return updated;
    });
  };

  const handleSaveProjectSettings = async (projectDTag: string) => {
    const settings = projectSettings.get(projectDTag);
    if (!settings || !ndk || !user) return;

    try {
      // Create a model/tools change event (kind 24020)
      const changeEvent = new NDKEvent(ndk);
      changeEvent.kind = 24020;
      changeEvent.content = "";
      changeEvent.tags = [
        ["p", agentSlug], // Target agent pubkey
        ["model", settings.selectedModel], // New model slug
        ["a", `31333:${user.pubkey}:${projectDTag}`], // Project reference
      ];

      // Add tool tags - one tag per tool
      Array.from(settings.selectedTools).forEach(tool => {
        changeEvent.tags.push(["tool", tool]);
      });

      await changeEvent.publish();
      toast.success(`Settings updated for ${settings.projectTitle}`);

      // Update the original values to reflect the saved state
      setProjectSettings((prev) => {
        const updated = new Map(prev);
        const updatedSettings = updated.get(projectDTag);
        if (updatedSettings) {
          updatedSettings.originalModel = updatedSettings.selectedModel;
          updatedSettings.originalTools = Array.from(updatedSettings.selectedTools);
        }
        return updated;
      });
    } catch (error) {
      console.error("Failed to update project settings:", error);
      toast.error("Failed to update project settings");
    }
  };

  const handleSave = async () => {
    if (!agentSlug) {
      toast.error("Agent slug is required");
      return;
    }

    if (!selectedVoice) {
      toast.error("Please select a voice");
      return;
    }

    setIsSaving(true);
    try {
      const voiceInfo = getVoiceInfo(voices, selectedVoice);
      if (voiceInfo) {
        saveAgentVoiceConfig(agentSlug, {
          voiceId: voiceInfo.voiceId,
          voiceName: voiceInfo.displayName,
          language: voiceInfo.displayLanguage || voiceInfo.locale,
          gender: voiceInfo.gender,
        });
        toast.success("Voice settings saved successfully");
      } else {
        toast.error("Selected voice not found");
      }
    } catch (error) {
      console.error("Failed to save voice settings:", error);
      toast.error("Failed to save voice settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="p-6">
        <div className="max-w-4xl space-y-8">
          {/* Voice Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Voice Settings
              </CardTitle>
              <CardDescription>
                Configure the text-to-speech voice for this agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VoiceSelector
                value={selectedVoice}
                onValueChange={setSelectedVoice}
                apiKey={apiKey}
              />
              <p className="text-sm text-muted-foreground">
                This voice will be used when playing text from this agent across all
                projects.
              </p>

              <Button
                onClick={handleSave}
                disabled={!selectedVoice || isSaving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Voice Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Project-specific Settings */}
          {agentProjects.length > 0 && (
            <div className="space-y-6">
              {agentProjects.map(({ dTag, title }) => {
                const settings = projectSettings.get(dTag);
                if (!settings) return null;

                const hasChanges = 
                  settings.selectedModel !== settings.originalModel ||
                  Array.from(settings.selectedTools).sort().join(',') !== 
                  (settings.originalTools || []).sort().join(',');

                return (
                  <ProjectSettingsCard
                    key={dTag}
                    projectDTag={dTag}
                    projectTitle={title}
                    settings={settings}
                    hasChanges={hasChanges}
                    onModelChange={handleProjectModelChange}
                    onToolToggle={handleProjectToolToggle}
                    onSave={handleSaveProjectSettings}
                  />
                );
              })}
            </div>
          )}

          {agentProjects.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  This agent is not currently active in any projects.
                  <br />
                  Add it to a project to configure model and tool settings.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// Component for individual project settings
function ProjectSettingsCard({
  projectDTag,
  projectTitle,
  settings,
  hasChanges,
  onModelChange,
  onToolToggle,
  onSave,
}: {
  projectDTag: string;
  projectTitle: string;
  settings: ProjectAgentSettings;
  hasChanges: boolean;
  onModelChange: (projectDTag: string, model: string) => void;
  onToolToggle: (projectDTag: string, tool: string) => void;
  onSave: (projectDTag: string) => Promise<void>;
}) {
  const availableModels = useProjectOnlineModels(projectDTag);
  const availableTools = useProjectAvailableTools(projectDTag);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(projectDTag);
    } finally {
      setIsSaving(false);
    }
  };

  return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<Settings2 className="w-4 h-4" />
							Project Settings
						</span>
						{hasChanges && (
							<Badge variant="outline" className="text-xs">
								Unsaved changes
							</Badge>
						)}
					</CardTitle>
					<CardDescription>
						Configure how this agent works in the {projectTitle} project
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Model Selection */}
					<div className="space-y-2">
						<label className="text-sm font-medium flex items-center gap-2">
							<Settings2 className="w-4 h-4" />
							Model
						</label>
						{availableModels.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No models available for this project
							</p>
						) : (
							<Select
								value={settings.selectedModel}
								onValueChange={(value) => onModelChange(projectDTag, value)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a model" />
								</SelectTrigger>
								<SelectContent>
									{availableModels.map((model) => (
										<SelectItem key={model.model} value={model.model}>
											<div className="flex items-center justify-between w-full">
												<span>{model.label}</span>
												{model.provider && (
													<span className="text-xs text-muted-foreground ml-2">
														{model.provider}
													</span>
												)}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						{settings.originalModel &&
							settings.selectedModel !== settings.originalModel && (
								<p className="text-xs text-muted-foreground">
									Previously: {settings.originalModel}
								</p>
							)}
					</div>

					{/* Tools Selection */}
					<div className="space-y-2">
						<label className="text-sm font-medium flex items-center gap-2">
							<Wrench className="w-4 h-4" />
							Tools
							<Badge variant="secondary" className="text-xs">
								{settings.selectedTools.size} selected
							</Badge>
						</label>

						{availableTools.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No tools available for this project
							</p>
						) : (
							<Card className="border bg-muted/10">
								<ScrollArea className="h-48 p-4">
									<div className="space-y-2">
										{availableTools.map((tool) => (
											<div
												key={tool}
												className="flex items-center space-x-3 py-1.5 px-2 rounded-md hover:bg-background/60 transition-colors"
											>
												<Checkbox
													id={`${projectDTag}-tool-${tool}`}
													checked={settings.selectedTools.has(tool)}
													onCheckedChange={() =>
														onToolToggle(projectDTag, tool)
													}
													className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
												/>
												<label
													htmlFor={`${projectDTag}-tool-${tool}`}
													className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 select-none"
												>
													{tool}
												</label>
											</div>
										))}
									</div>
								</ScrollArea>
							</Card>
						)}
					</div>

					{/* Save Button */}
					<div className="flex justify-end pt-4 border-t">
						<Button
							onClick={handleSave}
							disabled={!hasChanges || isSaving}
							size="sm"
							className="flex items-center gap-2"
						>
							<Save className="w-4 h-4" />
							{isSaving ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</CardContent>
			</Card>
		);
}
