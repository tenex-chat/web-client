import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { fetchProviderModels, DEFAULT_MODELS } from '@/services/llm-models';
import { logger } from '@/lib/logger';

type LLMProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'groq' | 'ollama';

interface LLMProviderSettings {
  id: string;
  provider: LLMProvider;
  apiKey?: string;
  model: string;
  enabled: boolean;
  temperature?: number;
  maxTokens?: number;
  isDefault?: boolean;
}

const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    description: 'GPT models with advanced capabilities',
    requiresApiKey: true,
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models known for safety and reasoning',
    requiresApiKey: true,
  },
  google: {
    name: 'Google',
    description: 'Gemini models with multimodal capabilities',
    requiresApiKey: true,
  },
  openrouter: {
    name: 'OpenRouter',
    description: 'Access multiple providers through one API',
    requiresApiKey: true,
  },
  groq: {
    name: 'Groq',
    description: 'Ultra-fast inference for open models',
    requiresApiKey: true,
  },
  ollama: {
    name: 'Ollama',
    description: 'Run models locally on your machine',
    requiresApiKey: false,
  },
};

// Import from unified store
import { useAIProviders } from '@/stores/ai-config-store';

export function LLMSettings() {
  const { providers: configs, setProviders: setConfigs } = useAIProviders();
  const [isAdding, setIsAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<Partial<LLMProviderSettings>>({
    provider: 'openai',
    model: '',
    enabled: true,
  });

  // Fetch models when provider changes
  useEffect(() => {
    if (formData.provider) {
      setLoadingModels(true);
      setFormData(prev => ({ ...prev, model: '' }));
      
      fetchProviderModels(formData.provider, formData.apiKey)
        .then(models => {
          setAvailableModels(models);
          if (models.length > 0) {
            setFormData(prev => ({ ...prev, model: models[0] }));
          }
        })
        .catch(error => {
          logger.error('Failed to fetch models:', error);
          setAvailableModels([]);
        })
        .finally(() => {
          setLoadingModels(false);
        });
    }
  }, [formData.provider]);

  const handleRefreshModels = async () => {
    if (!formData.provider) return;
    
    setLoadingModels(true);
    try {
      const models = await fetchProviderModels(formData.provider, formData.apiKey);
      setAvailableModels(models);
      if (!models.includes(formData.model || '') && models.length > 0) {
        setFormData(prev => ({ ...prev, model: models[0] }));
      }
      toast({
        title: 'Success',
        description: `Found ${models.length} models`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch models',
        variant: 'destructive',
      });
    } finally {
      setLoadingModels(false);
    }
  };

  const handleAddConfig = () => {
    if (!formData.provider || !formData.apiKey || !formData.model) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const newConfig: LLMProviderSettings = {
      id: Date.now().toString(),
      provider: formData.provider!,
      apiKey: formData.apiKey,
      model: formData.model!,
      enabled: formData.enabled ?? true,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      isDefault: configs.length === 0,
    };

    setConfigs([...configs, newConfig]);
    setIsAdding(false);
    setFormData({ provider: 'openai', model: DEFAULT_MODELS.openai, enabled: true });
    
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

  const handleTestConfig = async (config: LLMProviderSettings) => {
    setTestingId(config.id);
    
    try {
      let isValid = false;
      
      switch (config.provider) {
        case 'openai':
          if (config.apiKey) {
            const response = await fetch('https://api.openai.com/v1/models', {
              headers: {
                'Authorization': `Bearer ${config.apiKey}`,
              },
            });
            isValid = response.ok;
          }
          break;
          
        case 'anthropic':
          if (config.apiKey) {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: config.model,
                messages: [{role: 'user', content: 'test'}],
                max_tokens: 1,
              }),
            });
            isValid = response.status !== 401;
          }
          break;
          
        case 'openrouter':
          if (config.apiKey) {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
              headers: {
                'Authorization': `Bearer ${config.apiKey}`,
              },
            });
            isValid = response.ok;
          }
          break;
          
        case 'groq':
          if (config.apiKey) {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
              headers: {
                'Authorization': `Bearer ${config.apiKey}`,
              },
            });
            isValid = response.ok;
          }
          break;
          
        case 'ollama':
          const response = await fetch('http://localhost:11434/api/tags');
          isValid = response.ok;
          break;
          
        case 'google':
          isValid = !!config.apiKey;
          break;
          
        default:
          isValid = false;
      }
      
      if (isValid) {
        toast({
          title: 'Success',
          description: 'API key is valid and model is accessible',
        });
      } else {
        throw new Error('Invalid API key or configuration');
      }
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
                  <Label className="flex items-center justify-between">
                    Model
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleRefreshModels}
                      disabled={loadingModels || !formData.provider}
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingModels ? 'animate-spin' : ''}`} />
                    </Button>
                  </Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData({ ...formData, model: value })}
                    disabled={loadingModels || availableModels.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingModels ? "Loading models..." : "Select a model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.provider && PROVIDER_INFO[formData.provider]?.requiresApiKey && (
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={formData.apiKey || ''}
                    onChange={(e) => {
                      const newApiKey = e.target.value;
                      setFormData({ ...formData, apiKey: newApiKey });
                      // Re-fetch models if API key is provided for OpenAI
                      if (formData.provider === 'openai' && newApiKey) {
                        fetchProviderModels('openai', newApiKey)
                          .then(models => {
                            setAvailableModels(models);
                            if (!models.includes(formData.model || '') && models.length > 0) {
                              setFormData(prev => ({ ...prev, model: models[0] }));
                            }
                          });
                      }
                    }}
                  />
                </div>
              )}

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
                      setFormData({ provider: 'openai', model: '', enabled: true });
                      setAvailableModels([]);
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