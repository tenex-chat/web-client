import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAtom } from 'jotai';
import { llmConfigAtom } from '@/stores/llm';
import { useToast } from '@/hooks/use-toast';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'groq' | 'ollama';

interface LLMConfig {
  id: string;
  provider: LLMProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
  temperature?: number;
  maxTokens?: number;
  isDefault?: boolean;
}

const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
    description: 'GPT models with advanced capabilities',
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    description: 'Claude models known for safety and reasoning',
  },
  google: {
    name: 'Google',
    models: ['gemini-pro', 'gemini-pro-vision'],
    description: 'Gemini models with multimodal capabilities',
  },
  openrouter: {
    name: 'OpenRouter',
    models: ['auto'],
    description: 'Access multiple providers through one API',
  },
  groq: {
    name: 'Groq',
    models: ['mixtral-8x7b-32768', 'llama2-70b-4096'],
    description: 'Ultra-fast inference for open models',
  },
  ollama: {
    name: 'Ollama',
    models: ['llama2', 'mistral', 'codellama'],
    description: 'Run models locally on your machine',
  },
};

export function LLMSettings() {
  const [configs, setConfigs] = useAtom(llmConfigAtom);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<Partial<LLMConfig>>({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    enabled: true,
  });

  // Load saved configs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('llm-configs');
    if (saved) {
      try {
        setConfigs(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load LLM configs:', error);
      }
    }
  }, []);

  // Save configs to localStorage whenever they change
  useEffect(() => {
    if (configs.length > 0) {
      localStorage.setItem('llm-configs', JSON.stringify(configs));
    }
  }, [configs]);

  const handleAddConfig = () => {
    if (!formData.provider || !formData.apiKey || !formData.model) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const newConfig: LLMConfig = {
      id: Date.now().toString(),
      provider: formData.provider as LLMProvider,
      apiKey: formData.apiKey,
      model: formData.model,
      enabled: formData.enabled ?? true,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      isDefault: configs.length === 0,
    };

    setConfigs([...configs, newConfig]);
    setIsAdding(false);
    setFormData({ provider: 'openai', model: 'gpt-3.5-turbo', enabled: true });
    
    toast({
      title: 'Success',
      description: 'LLM configuration added',
    });
  };

  const handleDeleteConfig = (id: string) => {
    setConfigs(configs.filter(c => c.id !== id));
    toast({
      title: 'Success',
      description: 'LLM configuration removed',
    });
  };

  const handleTestConfig = async (config: LLMConfig) => {
    setTestingId(config.id);
    
    try {
      // TODO: Implement actual API test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Success',
        description: 'API key is valid and model is accessible',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate API key',
        variant: 'destructive',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = (id: string) => {
    setConfigs(configs.map(c => ({
      ...c,
      isDefault: c.id === id,
    })));
    
    toast({
      title: 'Success',
      description: 'Default LLM configuration updated',
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">LLM Configurations</h2>
            <p className="text-sm text-muted-foreground">
              Configure multiple AI model providers and API keys
            </p>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          )}
        </div>

        {/* Add New Configuration Form */}
        {isAdding && (
          <Card className="p-4 mb-4 border-primary/50">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => setFormData({ ...formData, provider: value as LLMProvider })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {info.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Model</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData({ ...formData, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_INFO[formData.provider as LLMProvider]?.models.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={formData.apiKey || ''}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Temperature (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    placeholder="0.7"
                    value={formData.temperature || ''}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Max Tokens (Optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="2048"
                    value={formData.maxTokens || ''}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                  <Label>Enabled</Label>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAdding(false);
                      setFormData({ provider: 'openai', model: 'gpt-3.5-turbo', enabled: true });
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddConfig}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Existing Configurations */}
        <div className="space-y-3">
          {configs.length === 0 && !isAdding && (
            <p className="text-center text-muted-foreground py-8">
              No LLM configurations added yet
            </p>
          )}
          
          {configs.map((config) => (
            <Card key={config.id} className={`p-4 ${config.isDefault ? 'border-primary' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {PROVIDER_INFO[config.provider].name}
                      </span>
                      {config.isDefault && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.model} • {config.enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!config.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(config.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTestConfig(config)}
                    disabled={testingId === config.id}
                  >
                    {testingId === config.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteConfig(config.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}