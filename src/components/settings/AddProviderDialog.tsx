import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  providerRegistry,
  type ProviderConfig,
  type ProviderType,
} from "@/services/ai/provider-registry";
import { type LLMConfig } from "@/stores/ai-config-store";
import { modelDiscovery, type Model } from "@/services/ai/model-discovery";

interface AddProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (provider: LLMConfig) => void;
}

export function AddProviderDialog({
  open,
  onClose,
  onAdd,
}: AddProviderDialogProps) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<ProviderType>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsFetchError, setModelsFetchError] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleFetchModels = async () => {
    if (!apiKey) {
      toast.error("Please enter an API key first");
      return;
    }

    setLoadingModels(true);
    setModelsFetchError(false);
    setModels([]);
    setModel("");

    try {
      const fetchedModels = await modelDiscovery.fetchModels(provider, apiKey);
      setModels(fetchedModels);
      if (fetchedModels.length > 0) {
        setModel(fetchedModels[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      setModelsFetchError(true);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey) {
      toast.error("API key is required");
      return;
    }

    if (!model && !modelsFetchError) {
      toast.error("Please select or enter a model");
      return;
    }

    setTesting(true);
    const config: ProviderConfig = {
      id: `${provider}-${Date.now()}`,
      provider,
      apiKey,
      model: model || undefined,
      baseURL: baseURL || undefined,
    };

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
      setTesting(false);
    }
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Configuration name is required");
      return;
    }

    if (!apiKey) {
      toast.error("API key is required");
      return;
    }

    if (!model && !modelsFetchError) {
      toast.error("Please select or enter a model");
      return;
    }

    const config: LLMConfig = {
      id: crypto.randomUUID(),
      name: name.trim(),
      provider,
      apiKey,
      model: model || undefined,
      baseURL: baseURL || undefined,
    };

    onAdd(config);
    // Reset form
    setName("");
    setApiKey("");
    setModel("");
    setBaseURL("");
    setModels([]);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add LLM Configuration</DialogTitle>
          <DialogDescription>
            Configure a new LLM provider for text generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Configuration Name */}
          <div className="space-y-2">
            <Label htmlFor="config-name">Configuration Name *</Label>
            <Input
              id="config-name"
              placeholder="e.g., Personal OpenAI, Work GPT-4"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to identify this configuration
            </p>
          </div>
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => setProvider(value as ProviderType)}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never sent to our servers
            </p>
          </div>

          {/* Fetch Models Button */}
          <Button
            variant="outline"
            onClick={handleFetchModels}
            disabled={!apiKey || loadingModels}
            className="w-full"
          >
            {loadingModels ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching models...
              </>
            ) : (
              "Fetch Available Models"
            )}
          </Button>

          {/* Model Selection or Input */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            {models.length > 0 ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : modelsFetchError ? (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Could not fetch models. Enter model ID manually:
                  </AlertDescription>
                </Alert>
                <Input
                  id="model"
                  placeholder="e.g., gpt-4o, claude-3-opus"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </>
            ) : (
              <Input
                id="model"
                placeholder="Fetch models first or enter manually"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            )}
          </div>

          {/* Base URL (optional) */}
          <div className="space-y-2">
            <Label htmlFor="base-url">Base URL (optional)</Label>
            <Input
              id="base-url"
              placeholder="https://api.openai.com/v1"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Only needed for custom endpoints
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!apiKey || !model || testing}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test"
            )}
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim() || !apiKey || !model}>
            Add Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
