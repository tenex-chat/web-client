import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { voiceDiscovery, type Voice } from "@/services/ai/voice-discovery";
import { useAtomValue } from "jotai";
import { openAIApiKeyAtom } from "@/stores/ai-config-store";

interface VoiceSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  currentVoiceIds?: string[];
  provider: "openai" | "elevenlabs";
  apiKey?: string;
  onSelect?: (voiceId: string) => void;
  onMultiSelect?: (voiceIds: string[]) => void;
  multiSelect?: boolean;
}

export function VoiceSelectionDialog({
  open,
  onClose,
  currentVoiceIds,
  provider,
  apiKey,
  onSelect,
  onMultiSelect,
  multiSelect = false,
}: VoiceSelectionDialogProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    currentVoiceIds?.[0] || "",
  );
  const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>(
    currentVoiceIds || []
  );
  const [previewing, setPreviewingId] = useState<string | null>(null);
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);

  // Use appropriate API key based on provider
  const effectiveApiKey = provider === "openai" ? openAIApiKey : apiKey;

  useEffect(() => {
    async function loadVoices() {
      if (!effectiveApiKey) {
        toast.error(`${provider} API key is required`);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const fetchedVoices = await voiceDiscovery.fetchVoices(
          provider,
          effectiveApiKey,
        );
        setVoices(fetchedVoices);
      } catch (error) {
        console.error("Failed to load voices:", error);
        toast.error("Failed to load voices");
      } finally {
        setLoading(false);
      }
    }

    if (open) {
      loadVoices();
    }
  }, [open, provider, effectiveApiKey]);

  const handlePreview = async (voiceId: string) => {
    if (!effectiveApiKey) return;

    setPreviewingId(voiceId);
    try {
      const audioBlob = await voiceDiscovery.previewVoice(
        provider,
        voiceId,
        "Hello! This is a preview of my voice.",
        effectiveApiKey,
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setPreviewingId(null);
      };
    } catch (error) {
      console.error("Failed to preview voice:", error);
      toast.error("Failed to preview voice");
      setPreviewingId(null);
    }
  };

  const handleConfirm = () => {
    if (multiSelect) {
      if (selectedVoiceIds.length > 0 && onMultiSelect) {
        onMultiSelect(selectedVoiceIds);
        onClose();
      }
    } else {
      if (selectedVoiceId && onSelect) {
        onSelect(selectedVoiceId);
        onClose();
      }
    }
  };

  const handleToggleVoice = (voiceId: string) => {
    if (selectedVoiceIds.includes(voiceId)) {
      setSelectedVoiceIds(selectedVoiceIds.filter(id => id !== voiceId));
    } else {
      setSelectedVoiceIds([...selectedVoiceIds, voiceId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[600px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {multiSelect ? "Select Voices" : "Select Voice"}
            {multiSelect && selectedVoiceIds.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({selectedVoiceIds.length} selected)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : voices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No voices available
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            {multiSelect ? (
              // Multi-selection mode with checkboxes
              <div className="space-y-2">
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={voice.id}
                      checked={selectedVoiceIds.includes(voice.id)}
                      onCheckedChange={() => handleToggleVoice(voice.id)}
                    />
                    <Label htmlFor={voice.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{voice.name}</div>
                      {voice.description && (
                        <div className="text-sm text-muted-foreground">
                          {voice.description}
                        </div>
                      )}
                      {voice.labels && (
                        <div className="flex gap-2 mt-1">
                          {voice.labels.gender && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {voice.labels.gender}
                            </span>
                          )}
                          {voice.labels.accent && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {voice.labels.accent}
                            </span>
                          )}
                          {voice.labels.useCase && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {voice.labels.useCase}
                            </span>
                          )}
                        </div>
                      )}
                    </Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePreview(voice.id)}
                      disabled={previewing === voice.id}
                    >
                      {previewing === voice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              // Single selection mode with radio buttons
              <RadioGroup
                value={selectedVoiceId}
                onValueChange={setSelectedVoiceId}
              >
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50"
                  >
                    <RadioGroupItem value={voice.id} id={voice.id} />
                    <Label htmlFor={voice.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{voice.name}</div>
                      {voice.description && (
                        <div className="text-sm text-muted-foreground">
                          {voice.description}
                        </div>
                      )}
                      {voice.labels && (
                        <div className="flex gap-2 mt-1">
                          {voice.labels.gender && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {voice.labels.gender}
                            </span>
                          )}
                          {voice.labels.accent && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {voice.labels.accent}
                            </span>
                          )}
                          {voice.labels.useCase && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {voice.labels.useCase}
                            </span>
                          )}
                        </div>
                      )}
                    </Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePreview(voice.id)}
                      disabled={previewing === voice.id}
                    >
                      {previewing === voice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={multiSelect ? selectedVoiceIds.length === 0 : !selectedVoiceId}
          >
            {multiSelect ? `Select ${selectedVoiceIds.length} Voice${selectedVoiceIds.length !== 1 ? 's' : ''}` : 'Select Voice'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
