import { useState, useEffect } from "react";
import { NDKAgentDefinition } from "@/lib/ndk-events/NDKAgentDefinition";
import { Volume2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAgentVoiceConfig, saveAgentVoiceConfig } from "@/lib/voice-config";
import { VoiceSelector } from "@/components/voice/VoiceSelector";
import { useMurfVoices, getVoiceInfo } from "@/hooks/useMurfVoices";
import { useTTSConfig } from "@/stores/llmConfig";

interface AgentSettingsTabProps {
  agent?: NDKAgentDefinition;
  agentSlug: string; // This is actually the agent's pubkey for profile pages
}

export function AgentSettingsTab({ agentSlug }: AgentSettingsTabProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const { config: ttsConfig } = useTTSConfig();
  const apiKey = ttsConfig?.apiKey;
  const { voices } = useMurfVoices(apiKey);

  // Load saved voice configuration on mount
  useEffect(() => {
    if (agentSlug) {
      const config = getAgentVoiceConfig(agentSlug);
      if (config?.voiceId) {
        setSelectedVoice(config.voiceId);
      }
    }
  }, [agentSlug]);

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
    <div className="p-6">
      <div className="max-w-2xl space-y-6">
        {/* Voice Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Voice Settings</h3>
          </div>

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
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Additional settings sections can be added here in the future */}
      </div>
    </div>
  );
}
