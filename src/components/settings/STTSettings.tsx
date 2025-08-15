import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchOpenAIModelsWithDetails, type OpenAIModelWithAudio } from '@/services/llm-models';
import { STORAGE_KEYS } from '@/lib/constants/storage';
import { logger } from '@/lib/logger';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getWaveBlob } from 'webm-to-wav-converter';

interface STTSettings {
  model: string;
  provider: 'openai';
}

interface LLMProviderSettings {
  id: string;
  provider: string;
  apiKey?: string;
  model: string;
  enabled: boolean;
}

export function STTSettings() {
  const [settings, setSettings] = useState<STTSettings>({
    model: 'whisper-1',
    provider: 'openai'
  });
  
  const [audioModels, setAudioModels] = useState<OpenAIModelWithAudio[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [openAIApiKey, setOpenAIApiKey] = useState<string>('');

  // Load saved settings and check for OpenAI API key
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEYS.STT_SETTINGS);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        logger.error('Failed to parse STT settings:', error);
      }
    }

    // Check if OpenAI API key exists in LLM configs
    const llmConfigs = localStorage.getItem('llm-configs');
    if (llmConfigs) {
      try {
        const configs = JSON.parse(llmConfigs) as LLMProviderSettings[];
        const openAIConfig = configs.find(c => c.provider === 'openai' && c.enabled);
        if (openAIConfig?.apiKey) {
          setHasOpenAIKey(true);
          setOpenAIApiKey(openAIConfig.apiKey);
        }
      } catch (error) {
        logger.error('Failed to parse LLM configs:', error);
      }
    }
  }, []);

  // Fetch models when component mounts
  useEffect(() => {
    fetchModels();
  }, [openAIApiKey]);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await fetchOpenAIModelsWithDetails(openAIApiKey || undefined);
      setAudioModels(models);
      
      if (models.length === 0) {
        logger.warn('No audio-capable models found');
      }
    } catch (error) {
      logger.error('Failed to fetch OpenAI models:', error);
      toast.error('Failed to fetch available models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEYS.STT_SETTINGS, JSON.stringify(settings));
      toast.success('Speech-to-text settings saved');
    } catch (error) {
      logger.error('Failed to save STT settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModelChange = (modelId: string) => {
    setSettings(prev => ({ ...prev, model: modelId }));
  };

  const testTranscription = async () => {
    if (!settings.model) {
      toast.error('Please select a model first');
      return;
    }

    if (!hasOpenAIKey) {
      toast.error('OpenAI API key required. Please configure it in LLM settings.');
      return;
    }

    try {
      // Test with a simple audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Record in WebM format (browser native)
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        toast.info('Converting audio to WAV format...');
        
        try {
          // Convert WebM to WAV
          const wavBlob = await getWaveBlob(webmBlob, {
            sampleRate: 16000  // 16kHz is good for speech
          });
          
          toast.info('Sending to OpenAI for transcription...');
          
          // Use different API based on model
          if (settings.model === 'whisper-1') {
            // Use Whisper API for transcription
            const formData = new FormData();
            formData.append('file', wavBlob, 'audio.wav');
            formData.append('model', 'whisper-1');
            
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
              },
              body: formData
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error?.message || 'Transcription failed');
            }

            const data = await response.json();
            const transcription = data.text || 'No transcription received';
            
            toast.success('Transcription successful!', {
              description: transcription,
              duration: 10000
            });
          } else if (settings.model === 'gpt-4o-transcribe') {
            // Use completions API for gpt-4o-transcribe
            // Convert WAV blob to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Audio = reader.result?.toString().split(',')[1];
              if (!base64Audio) {
                toast.error('Failed to process audio');
                return;
              }

              // Use completions endpoint (not chat/completions)
              const response = await fetch('https://api.openai.com/v1/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openAIApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: settings.model,
                  prompt: `Transcribe the following audio: [audio:${base64Audio}]`,
                  max_tokens: 500,
                  temperature: 0.1
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Transcription failed');
              }

              const data = await response.json();
              const transcription = data.choices?.[0]?.text?.trim() || 'No transcription received';
              
              toast.success('Transcription successful!', {
                description: transcription,
                duration: 10000
              });
            };
            
            reader.readAsDataURL(wavBlob);
          }
        } catch (error) {
          logger.error('Transcription error:', error);
          toast.error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      toast.info('Recording... Speak now (3 seconds)');
      mediaRecorder.start();
      
      setTimeout(() => {
        mediaRecorder.stop();
      }, 3000);
      
    } catch (error) {
      logger.error('Microphone test failed:', error);
      toast.error('Failed to access microphone. Please check permissions.');
    }
  };

  const selectedModel = audioModels.find(m => m.id === settings.model);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Speech-to-Text Configuration</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure OpenAI models for transcribing voice input
        </p>

        {!hasOpenAIKey && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              OpenAI API key is required for speech-to-text. Please configure it in the LLM settings tab.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="stt-model">Transcription Model</Label>
            <Select
              value={settings.model}
              onValueChange={handleModelChange}
              disabled={isLoadingModels || !hasOpenAIKey}
            >
              <SelectTrigger id="stt-model">
                <SelectValue placeholder={
                  isLoadingModels ? "Loading models..." : 
                  audioModels.length === 0 ? "No audio models available" :
                  "Select a model"
                } />
              </SelectTrigger>
              <SelectContent>
                {audioModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.id}</span>
                      {model.supportsAudio && (
                        <Mic className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {audioModels.length} audio-capable model{audioModels.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Selected Model Info */}
          {selectedModel && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Model Details</span>
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Model:</span> {selectedModel.id}
                </div>
                {selectedModel.id === 'whisper-1' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Type:</span> Dedicated speech recognition model
                    </div>
                    <div>
                      <span className="text-muted-foreground">Languages:</span> Multiple languages with automatic detection
                    </div>
                  </>
                )}
                {selectedModel.id === 'gpt-4o-transcribe' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Type:</span> GPT-4o transcription model
                    </div>
                    <div>
                      <span className="text-muted-foreground">API:</span> Uses completions endpoint
                    </div>
                  </>
                )}
                <div>
                  <span className="text-muted-foreground">Format:</span> Converts WebM to WAV for compatibility
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !settings.model}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
            
            <Button
              variant="outline"
              onClick={testTranscription}
              disabled={!settings.model || !hasOpenAIKey}
            >
              <Mic className="h-4 w-4 mr-2" />
              Test Microphone
            </Button>

            <Button
              variant="outline"
              onClick={fetchModels}
              disabled={isLoadingModels}
            >
              {isLoadingModels && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Refresh Models
            </Button>
          </div>
        </div>
      </Card>

      {/* Usage Instructions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">How Voice Input Works</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            1. <strong>Select a Model:</strong> Choose between Whisper or GPT-4o-transcribe for speech recognition.
          </p>
          <p>
            2. <strong>Enable Voice Mode:</strong> Once configured, you can enable voice input in any conversation 
            using the microphone button.
          </p>
          <p>
            3. <strong>Transcription:</strong> Your speech will be converted to text using OpenAI's models 
            and sent as a regular message.
          </p>
          <p>
            4. <strong>Privacy:</strong> Audio is processed through OpenAI's API. 
            No audio is stored locally after transcription.
          </p>
        </div>
      </Card>
    </div>
  );
}