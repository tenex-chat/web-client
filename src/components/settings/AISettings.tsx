import { useState } from "react";
import { useAtom } from "jotai";
import {
  activeProviderAtom,
  voiceSettingsAtom,
  sttSettingsAtom,
  openAIApiKeyAtom,
  llmConfigsAtom,
  activeLLMConfigIdAtom,
  type LLMConfig,
} from "@/stores/ai-config-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Plus, Volume2, Key, Users, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddProviderDialog } from "./AddProviderDialog";
import { VoiceSelectionDialog } from "./VoiceSelectionDialog";
import { providerRegistry } from "@/services/ai/provider-registry";
import { voiceDiscovery } from "@/services/ai/voice-discovery";

export function AISettings() {
  const [activeProvider] = useAtom(activeProviderAtom);
  const [voiceSettings, setVoiceSettings] = useAtom(voiceSettingsAtom);
  const [sttSettings, setSTTSettings] = useAtom(sttSettingsAtom);
  const [openAIApiKey, setOpenAIApiKey] = useAtom(openAIApiKeyAtom);
  const [llmConfigs, setLLMConfigs] = useAtom(llmConfigsAtom);
  const [activeConfigId, setActiveConfigId] = useAtom(activeLLMConfigIdAtom);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState<boolean | 'multi'>(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState(false);

  const handleTestConnection = async (config: LLMConfig) => {
    setTestingConnection(config.id);
    try {
      const result = await providerRegistry.testConnection(config);
      if (result.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch {
      toast.error("Failed to test connection");
    } finally {
      setTestingConnection(null);
    }
  };

  const handleDeleteConfig = (configId: string) => {
    setLLMConfigs(prev => prev.filter(c => c.id !== configId));
    // If the deleted config was the active one, select a new active config
    if (activeConfigId === configId) {
      const remaining = llmConfigs.filter(c => c.id !== configId);
      setActiveConfigId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.success("LLM configuration removed");
  };

  const handleAddConfig = (newConfig: LLMConfig) => {
    setLLMConfigs(prev => [...prev, newConfig]);
    // If it's the first one, make it active
    if (llmConfigs.length === 0) {
      setActiveConfigId(newConfig.id);
    }
    setShowAddProvider(false);
    toast.success("LLM configuration added successfully");
  };

  const handlePreviewVoice = async () => {
    if (!voiceSettings.voiceId) {
      toast.error("No voice selected");
      return;
    }

    const apiKey =
      voiceSettings.provider === "openai" ? openAIApiKey : voiceSettings.apiKey;
    if (!apiKey) {
      toast.error(`${voiceSettings.provider} API key required`);
      return;
    }

    setPreviewingVoice(true);
    try {
      const audioBlob = await voiceDiscovery.previewVoice(
        voiceSettings.provider,
        voiceSettings.voiceId,
        "Hello! This is a preview of the selected voice.",
        apiKey,
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error("Failed to preview voice:", error);
      toast.error("Failed to preview voice");
    } finally {
      setPreviewingVoice(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Provider Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🤖</span> AI Providers
          </CardTitle>
          <CardDescription>
            Manage your LLM configurations for text generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {llmConfigs.length > 0 ? (
            <div className="space-y-4">
              {llmConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    activeConfigId === config.id ? "border-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroup value={activeConfigId || ""}>
                      <RadioGroupItem
                        value={config.id}
                        checked={activeConfigId === config.id}
                        onClick={() => setActiveConfigId(config.id)}
                      />
                    </RadioGroup>
                    <div className="space-y-1">
                      <div className="font-medium">{config.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="capitalize">{config.provider}</span>
                        <span>•</span>
                        <span>{config.model || "default"}</span>
                        <span>•</span>
                        <span>•••••{config.apiKey.slice(-4)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeConfigId === config.id && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs text-primary">
                        <Check className="h-3 w-3" />
                        Active
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(config)}
                      disabled={testingConnection === config.id}
                    >
                      {testingConnection === config.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConfig(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                onClick={() => setShowAddProvider(true)}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Configuration
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                No LLM configurations added yet
              </p>
              <Button onClick={() => setShowAddProvider(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Configuration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🎤</span> Voice Settings
          </CardTitle>
          <CardDescription>
            Configure speech-to-text and text-to-speech
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Speech-to-Text */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stt-enabled">Speech-to-Text</Label>
              <Switch
                id="stt-enabled"
                checked={sttSettings.enabled}
                onCheckedChange={(enabled) => setSTTSettings({ enabled })}
              />
            </div>
            {sttSettings.enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>STT Provider</Label>
                  <RadioGroup
                    value={sttSettings.provider}
                    onValueChange={(provider: "whisper" | "elevenlabs" | "built-in-chrome") =>
                      setSTTSettings({ provider })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="whisper" id="stt-whisper" />
                      <Label htmlFor="stt-whisper">OpenAI Whisper</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="elevenlabs" id="stt-elevenlabs" />
                      <Label htmlFor="stt-elevenlabs">ElevenLabs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="built-in-chrome" id="stt-chrome" />
                      <Label htmlFor="stt-chrome">Built-in Chrome</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {sttSettings.provider === "whisper" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="stt-openai-key"
                      className="flex items-center gap-2"
                    >
                      <Key className="h-4 w-4" />
                      OpenAI API Key for STT
                    </Label>
                    <Input
                      id="stt-openai-key"
                      type="password"
                      placeholder="Enter your OpenAI API key"
                      value={openAIApiKey || ""}
                      onChange={(e) => setOpenAIApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Uses Whisper model: {sttSettings.model}
                    </p>
                  </div>
                )}
                
                {sttSettings.provider === "elevenlabs" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="stt-elevenlabs-key"
                      className="flex items-center gap-2"
                    >
                      <Key className="h-4 w-4" />
                      ElevenLabs API Key
                    </Label>
                    <Input
                      id="stt-elevenlabs-key"
                      type="password"
                      placeholder="Enter your ElevenLabs API key"
                      value={voiceSettings.apiKey || ""}
                      onChange={(e) =>
                        setVoiceSettings({ apiKey: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {voiceSettings.apiKey ? 
                        "This key is shared with Text-to-Speech settings" : 
                        "Get your API key from the ElevenLabs dashboard"}
                    </p>
                  </div>
                )}
                
                {sttSettings.provider === "built-in-chrome" && (
                  <div className="pl-4 space-y-2 text-sm text-muted-foreground">
                    <p>Uses browser's built-in speech recognition</p>
                    <p>No API key required</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Text-to-Speech */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="tts-enabled">Text-to-Speech</Label>
              <Switch
                id="tts-enabled"
                checked={voiceSettings.enabled}
                onCheckedChange={(enabled) => setVoiceSettings({ enabled })}
              />
            </div>

            {voiceSettings.enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Voice Provider</Label>
                  <RadioGroup
                    value={voiceSettings.provider}
                    onValueChange={(provider: "openai" | "elevenlabs") =>
                      setVoiceSettings({ provider })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="openai" id="voice-openai" />
                      <Label htmlFor="voice-openai">OpenAI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="elevenlabs"
                        id="voice-elevenlabs"
                      />
                      <Label htmlFor="voice-elevenlabs">ElevenLabs</Label>
                    </div>
                  </RadioGroup>
                </div>

                {voiceSettings.provider === "openai" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="openai-key"
                      className="flex items-center gap-2"
                    >
                      <Key className="h-4 w-4" />
                      OpenAI API Key
                    </Label>
                    <Input
                      id="openai-key"
                      type="password"
                      placeholder="Enter your OpenAI API key"
                      value={openAIApiKey || ""}
                      onChange={(e) => setOpenAIApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your API key from platform.openai.com
                    </p>
                  </div>
                )}

                {voiceSettings.provider === "elevenlabs" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="elevenlabs-key"
                      className="flex items-center gap-2"
                    >
                      <Key className="h-4 w-4" />
                      ElevenLabs API Key
                    </Label>
                    <Input
                      id="elevenlabs-key"
                      type="password"
                      placeholder="Enter your ElevenLabs API key"
                      value={voiceSettings.apiKey || ""}
                      onChange={(e) =>
                        setVoiceSettings({ apiKey: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {voiceSettings.apiKey ? 
                        "This key is shared with Speech-to-Text settings" : 
                        "Get your API key from the ElevenLabs dashboard"}
                    </p>
                  </div>
                )}

                {/* Voice Selection */}
                {voiceSettings.voiceIds && voiceSettings.voiceIds.length > 0 ? (
                  // Multi-voice selection (deterministic assignment)
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Selected Voices ({voiceSettings.voiceIds.length})
                    </Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {voiceSettings.voiceIds.map((voiceId) => (
                          <div
                            key={voiceId}
                            className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
                          >
                            <span>{voiceId}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => {
                                const updatedVoiceIds = voiceSettings.voiceIds?.filter(
                                  (id) => id !== voiceId
                                );
                                // If removing leaves only one voice, switch to single voice mode
                                if (updatedVoiceIds?.length === 1) {
                                  setVoiceSettings({
                                    voiceId: updatedVoiceIds[0],
                                    voiceIds: [],
                                  });
                                } else {
                                  setVoiceSettings({
                                    voiceIds: updatedVoiceIds,
                                  });
                                }
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Each agent will be assigned a consistent voice based on their ID
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const hasApiKey =
                          voiceSettings.provider === "openai"
                            ? !!openAIApiKey
                            : !!voiceSettings.apiKey;

                        if (!hasApiKey) {
                          toast.error(
                            `Please enter your ${voiceSettings.provider === "openai" ? "OpenAI" : "ElevenLabs"} API key first`,
                          );
                          return;
                        }
                        setShowVoiceSelection('multi');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Voices
                    </Button>
                  </div>
                ) : (
                  // Single voice selection
                  <div className="space-y-2">
                    <Label>
                      Voice: {voiceSettings.voiceId || "None selected"}
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hasApiKey =
                            voiceSettings.provider === "openai"
                              ? !!openAIApiKey
                              : !!voiceSettings.apiKey;

                          if (!hasApiKey) {
                            toast.error(
                              `Please enter your ${voiceSettings.provider === "openai" ? "OpenAI" : "ElevenLabs"} API key first`,
                            );
                            return;
                          }
                          setShowVoiceSelection(true);  // Single select mode
                        }}
                      >
                        Select Voice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hasApiKey =
                            voiceSettings.provider === "openai"
                              ? !!openAIApiKey
                              : !!voiceSettings.apiKey;

                          if (!hasApiKey) {
                            toast.error(
                              `Please enter your ${voiceSettings.provider === "openai" ? "OpenAI" : "ElevenLabs"} API key first`,
                            );
                            return;
                          }
                          // Force multi-select mode by passing a flag to the dialog
                          setShowVoiceSelection('multi');
                        }}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Select Multiple Voices
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviewVoice}
                        disabled={!voiceSettings.voiceId || previewingVoice}
                      >
                        {previewingVoice ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4 mr-2" />
                        )}
                        Preview
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Single voice: All agents use the same voice<br/>
                      Multiple voices: Each agent gets a consistent voice based on their ID
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Speed: {voiceSettings.speed}x</Label>
                  <Slider
                    value={[voiceSettings.speed]}
                    onValueChange={([speed]) => setVoiceSettings({ speed })}
                    min={0.5}
                    max={2}
                    step={0.1}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-speak">Auto-speak replies</Label>
                  <Switch
                    id="auto-speak"
                    checked={voiceSettings.autoSpeak}
                    onCheckedChange={(autoSpeak) =>
                      setVoiceSettings({ autoSpeak })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⚡</span> Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const activeConfig = llmConfigs.find(c => c.id === activeConfigId);
                if (activeConfig) {
                  handleTestConnection(activeConfig);
                } else {
                  toast.error("No active configuration selected");
                }
              }}
              disabled={!activeConfigId || testingConnection !== null}
            >
              Test Active Connection
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("ai-config-v2");
                window.location.reload();
              }}
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Provider Dialog */}
      {showAddProvider && (
        <AddProviderDialog
          open={showAddProvider}
          onClose={() => setShowAddProvider(false)}
          onAdd={handleAddConfig}
        />
      )}

      {/* Voice Selection Dialog */}
      {showVoiceSelection && (
        <VoiceSelectionDialog
          open={!!showVoiceSelection}
          onClose={() => setShowVoiceSelection(false)}
          currentVoiceId={voiceSettings.voiceId}
          currentVoiceIds={voiceSettings.voiceIds}
          provider={voiceSettings.provider}
          apiKey={voiceSettings.apiKey || undefined}
          multiSelect={showVoiceSelection === 'multi'}
          onSelect={(voiceId) => {
            setVoiceSettings({ voiceId, voiceIds: [] });
            toast.success("Voice selected successfully");
          }}
          onMultiSelect={(voiceIds) => {
            // If multiple voices are selected, use multi-voice mode
            // If only one voice is selected, use single voice mode
            if (voiceIds.length === 1) {
              setVoiceSettings({ voiceId: voiceIds[0], voiceIds: [] });
              toast.success("Voice selected successfully");
            } else if (voiceIds.length > 1) {
              setVoiceSettings({ voiceIds, voiceId: undefined });
              toast.success(`${voiceIds.length} voices selected for deterministic assignment`);
            }
          }}
        />
      )}
    </div>
  );
}
