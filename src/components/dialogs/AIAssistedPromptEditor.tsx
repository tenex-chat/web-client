import { useState } from "react";
import { useAtom } from "jotai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { llmConfigsAtom, type LLMConfig } from "@/stores/ai-config-store";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

interface AIAssistedPromptEditorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPrompt: string;
  onUpdatePrompt: (prompt: string) => void;
}

export function AIAssistedPromptEditor({
  isOpen,
  onOpenChange,
  currentPrompt,
  onUpdatePrompt,
}: AIAssistedPromptEditorProps) {
  const [llmConfigs] = useAtom(llmConfigsAtom);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    const selectedConfig = llmConfigs.find(c => c.id === selectedConfigId);
    if (!selectedConfig) {
      toast.error("Please select an LLM configuration");
      return;
    }

    if (!instructions.trim()) {
      toast.error("Please enter modification instructions");
      return;
    }

    setIsGenerating(true);
    try {
      // Create the appropriate provider based on config
      let provider: any;
      switch (selectedConfig.provider) {
        case "openai":
          provider = createOpenAI({
            apiKey: selectedConfig.apiKey,
            baseURL: selectedConfig.baseURL,
          });
          break;
        case "anthropic":
          provider = createAnthropic({
            apiKey: selectedConfig.apiKey,
            baseURL: selectedConfig.baseURL,
          });
          break;
        case "google":
          provider = createGoogleGenerativeAI({
            apiKey: selectedConfig.apiKey,
            baseURL: selectedConfig.baseURL,
          });
          break;
        case "openrouter":
          provider = createOpenRouter({
            apiKey: selectedConfig.apiKey,
            baseURL: selectedConfig.baseURL,
          });
          break;
        default:
          throw new Error(`Unknown provider: ${selectedConfig.provider}`);
      }

      const model = selectedConfig.model || getDefaultModel(selectedConfig.provider);

      const metaPrompt = `You are an expert in writing system prompts for AI agents.
A user wants to modify an existing system prompt.

Here is the current system prompt:
---
${currentPrompt || "No prompt provided yet - create a new one from scratch."}
---

Here is the user's instruction for how to change it:
---
${instructions}
---

Please generate the new system prompt based on the user's instruction.
Respond ONLY with the full, rewritten system prompt text. Do not add any extra explanations or markdown code blocks.`;

      const result = await generateText({
        model: provider(model),
        prompt: metaPrompt,
        maxSteps: 1,
      });

      const newPrompt = result.text.trim();
      setGeneratedPrompt(newPrompt);
      setShowPreview(true);
    } catch (error) {
      console.error("Failed to generate prompt:", error);
      toast.error("Failed to generate improved prompt");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedPrompt) {
      onUpdatePrompt(generatedPrompt);
      toast.success("System prompt updated successfully");
      onOpenChange(false);
      // Reset state
      setInstructions("");
      setGeneratedPrompt("");
      setShowPreview(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state
    setInstructions("");
    setGeneratedPrompt("");
    setShowPreview(false);
  };

  const getDefaultModel = (provider: string): string => {
    switch (provider) {
      case "openai":
        return "gpt-4o-mini";
      case "anthropic":
        return "claude-3-haiku-20240307";
      case "google":
        return "gemini-1.5-flash";
      case "openrouter":
        return "openai/gpt-4o-mini";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Assisted Prompt Editor
          </DialogTitle>
          <DialogDescription>
            Use AI to refine and improve your system prompt
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {!showPreview ? (
            <>
              {/* LLM Configuration Selection */}
              <div className="space-y-2">
                <Label htmlFor="llm-config">Select LLM Configuration</Label>
                {llmConfigs.length > 0 ? (
                  <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                    <SelectTrigger id="llm-config">
                      <SelectValue placeholder="Choose an LLM to assist you" />
                    </SelectTrigger>
                    <SelectContent>
                      {llmConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex items-center gap-2">
                            <span>{config.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({config.provider} - {config.model || "default"})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No LLM configurations found. Please add one in the AI Settings first.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Modification Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Modification Instructions</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Examples:
• Make the prompt more formal and professional
• Add instructions for the agent to be more concise
• Include guidelines about citing sources
• Make it friendlier and more conversational
• Add specific expertise in Python and machine learning"
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Describe how you want to modify the system prompt
                </p>
              </div>

              {/* Current Prompt Preview */}
              {currentPrompt && (
                <div className="space-y-2">
                  <Label>Current System Prompt</Label>
                  <div className="p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{currentPrompt}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Generated Prompt Preview */}
              <div className="space-y-2">
                <Label>Generated System Prompt</Label>
                <div className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{generatedPrompt}</p>
                </div>
              </div>

              {/* Instructions Reminder */}
              <div className="space-y-2">
                <Label>Your Instructions</Label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm italic">{instructions}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!showPreview ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedConfigId || !instructions.trim() || isGenerating || llmConfigs.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Back to Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button onClick={handleApply}>
                Apply Changes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}