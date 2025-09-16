import { useState } from "react";
import { useAtom } from "jotai";
import {
  activeProviderAtom,
  voiceSettingsAtom,
  sttSettingsAtom,
  openAIApiKeyAtom,
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
import { Loader2, Plus, Volume2, Key } from "lucide-react";
import { toast } from "sonner";
import { AddProviderDialog } from "./AddProviderDialog";
import { VoiceSelectionDialog } from "./VoiceSelectionDialog";
import { providerRegistry } from "@/services/ai/provider-registry";
import { voiceDiscovery } from "@/services/ai/voice-discovery";

export function AISettings() {
  const [activeProvider, setActiveProvider] = useAtom(activeProviderAtom);
  const [voiceSettings, setVoiceSettings] = useAtom(voiceSettingsAtom);
  const [sttSettings, setSTTSettings] = useAtom(sttSettingsAtom);
  const [openAIApiKey, setOpenAIApiKey] = useAtom(openAIApiKeyAtom);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(false);

  const handleTestConnection = async () => {
    if (!activeProvider) {
      toast.error("No provider configured");
      return;
    }

    setTestingConnection(true);
    try {
      const result = await providerRegistry.testConnection(activeProvider);
      if (result.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch {
      toast.error("Failed to test connection");
    } finally {
      setTestingConnection(false);
    }
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
            <span>🤖</span> AI Provider
          </CardTitle>
          <CardDescription>
            Configure your AI provider for text generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeProvider ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {activeProvider.provider}
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {activeProvider.model}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    API Key: •••••••{activeProvider.apiKey.slice(-4)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveProvider(undefined)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                No AI provider configured
              </p>
              <Button onClick={() => setShowAddProvider(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
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
                        setShowVoiceSelection(true);
                      }}
                    >
                      Select Voice
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
                </div>

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
              onClick={handleTestConnection}
              disabled={!activeProvider || testingConnection}
            >
              Test Connection
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
          onAdd={(provider) => {
            setActiveProvider(provider);
            setShowAddProvider(false);
            toast.success("Provider added successfully");
          }}
        />
      )}

      {/* Voice Selection Dialog */}
      {showVoiceSelection && (
        <VoiceSelectionDialog
          open={showVoiceSelection}
          onClose={() => setShowVoiceSelection(false)}
          currentVoiceId={voiceSettings.voiceId}
          provider={voiceSettings.provider}
          apiKey={voiceSettings.apiKey || null}
          onSelect={(voiceId) => {
            setVoiceSettings({ voiceId });
            toast.success("Voice selected successfully");
          }}
        />
      )}
    </div>
  );
}
