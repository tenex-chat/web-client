import { Check, Loader2, TestTube, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTTS } from "@/stores/ai-config-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceSelector } from "@/components/voice/VoiceSelector";
import { MurfVoicesCache } from "@/services/murfVoicesCache";
import type { MurfVoice } from "@/hooks/useMurfVoices";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

const LANGUAGES = [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "es-ES", name: "Spanish" },
    { code: "fr-FR", name: "French" },
    { code: "de-DE", name: "German" },
    { code: "it-IT", name: "Italian" },
    { code: "pt-BR", name: "Portuguese (Brazil)" },
    { code: "ja-JP", name: "Japanese" },
    { code: "ko-KR", name: "Korean" },
    { code: "zh-CN", name: "Chinese (Simplified)" },
];

export function TTSSettings() {
    const { config: currentConfig, setConfig: setTTSConfig } = useTTS();

    const [provider] = useState<'murf'>("murf");
    const [apiKey, setApiKey] = useState(currentConfig?.apiKey || "");
    const [voiceId, setVoiceId] = useState(currentConfig?.voiceId || "");
    const [language, setLanguage] = useState("en-US");
    const [speed, setSpeed] = useState(currentConfig?.rate || 1.0);
    const [pitch, setPitch] = useState(currentConfig?.pitch || 1.0);
    const [volume, setVolume] = useState(currentConfig?.volume || 1.0);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<boolean | null>(null);
    const [voices, setVoices] = useState<MurfVoice[]>([]);
    const [, setIsLoadingVoices] = useState(false);
    const [voiceStyle, setVoiceStyle] = useState(currentConfig?.style || "Conversational");
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    // Fetch voices from Murf API with caching
    const fetchVoices = useCallback(async (apiKeyToUse: string, shouldSelectFirst: boolean = false) => {
        if (!apiKeyToUse) return;
        
        // Check cache first
        const cachedVoices = MurfVoicesCache.get();
        if (cachedVoices) {
            setVoices(cachedVoices);
            if (shouldSelectFirst && !voiceId && cachedVoices.length > 0) {
                if (cachedVoices[0]) {
                    setVoiceId(cachedVoices[0].voiceId);
                    if (cachedVoices[0].availableStyles && cachedVoices[0].availableStyles.length > 0) {
                        setVoiceStyle(cachedVoices[0].availableStyles[0]!);
                    }
                }
            }
            return;
        }
        
        setIsLoadingVoices(true);
        try {
            const response = await fetch("https://api.murf.ai/v1/speech/voices", {
                method: "GET",
                headers: {
                    "api-key": apiKeyToUse,
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Murf API returns an array of voice objects
                if (data && Array.isArray(data)) {
                    const parsedVoices = data.map((voice: MurfVoice) => ({
                        voiceId: voice.voiceId,
                        displayName: voice.displayName,
                        gender: voice.gender,
                        locale: voice.locale,
                        accent: voice.accent,
                        availableStyles: voice.availableStyles || ["Conversational"],
                        description: voice.description,
                        displayLanguage: voice.displayLanguage
                    }));
                    setVoices(parsedVoices);
                    
                    // Cache the voices
                    MurfVoicesCache.set(parsedVoices);
                    
                    // Only select first voice if explicitly requested and no voice is selected
                    if (shouldSelectFirst && !voiceId && parsedVoices.length > 0) {
                        if (parsedVoices[0]) {
                            setVoiceId(parsedVoices[0].voiceId);
                            if (parsedVoices[0].availableStyles && parsedVoices[0].availableStyles.length > 0) {
                                setVoiceStyle(parsedVoices[0].availableStyles[0]!);
                            }
                        }
                    }
                } else {
                    logger.error("Unexpected voices data format:", data);
                }
            } else {
                logger.error("Failed to fetch voices:", response.status, response.statusText);
            }
        } catch (error) {
            logger.error("Error fetching voices:", error);
        } finally {
            setIsLoadingVoices(false);
        }
    }, [voiceId]);

    // Only sync from config on initial mount, not on every config change
    // This prevents the input from being overwritten while typing
    useEffect(() => {
        if (currentConfig && currentConfig.apiKey) {
            // Fetch voices if we have an API key
            fetchVoices(currentConfig.apiKey, !currentConfig.voiceId);
        }
    }, []); // Empty dependency array - only run once on mount

    // Fetch voices when API key changes
    useEffect(() => {
        if (apiKey && validateMurfApiKey(apiKey)) {
            fetchVoices(apiKey, true);
        }
    }, [apiKey, fetchVoices]);

    // Check if there are unsaved changes
    const hasUnsavedChanges = currentConfig
        ? apiKey !== (currentConfig.apiKey || "") ||
          voiceId !== (currentConfig.voiceId || "") ||
          speed !== (currentConfig.rate || 1.0) ||
          pitch !== (currentConfig.pitch || 1.0) ||
          volume !== (currentConfig.volume || 1.0) ||
          voiceStyle !== (currentConfig.style || "Conversational")
        : apiKey !== "";

    const validateMurfApiKey = (key: string): boolean => {
        // Murf API keys should be non-empty strings
        // The actual validation happens when connecting to the WebSocket
        return key.length > 0;
    };

    const testTTSConfiguration = async (): Promise<boolean> => {
        try {
            // Test WebSocket connection to Murf API with proper endpoint
            const testUrl = `wss://api.murf.ai/v1/speech/stream-input?api-key=${encodeURIComponent(apiKey)}&sample_rate=44100&channel_type=MONO&format=WAV`;
            
            return new Promise((resolve) => {
                const ws = new WebSocket(testUrl);
                
                const timeout = setTimeout(() => {
                    ws.close();
                    resolve(false);
                }, 5000);

                ws.onopen = () => {
                    clearTimeout(timeout);
                    // Connection successful means API key is valid
                    // Send a test message with proper format
                    const testMessage = {
                        context_id: `test-${Date.now()}`,
                        voice_config: {
                            voiceId: voiceId || voices[0]?.voiceId || "en-US-marcus",
                            style: voiceStyle,
                            rate: speed - 1, // Murf expects 0 for normal, -1 for slower, +1 for faster
                            pitch: pitch - 1, // Same adjustment for pitch
                            variation: 1
                        },
                        text: "Test",
                        end: true
                    };
                    ws.send(JSON.stringify(testMessage));
                    
                    // Close connection after a brief moment
                    setTimeout(() => {
                        ws.close();
                        resolve(true);
                    }, 1000);
                };

                ws.onmessage = () => {
                    // If we receive any message back, the connection is working
                    clearTimeout(timeout);
                    ws.close();
                    resolve(true);
                };

                ws.onerror = (error) => {
                    logger.error("WebSocket error:", error);
                    clearTimeout(timeout);
                    ws.close();
                    resolve(false);
                };

                ws.onclose = (event) => {
                    // If closed with code 1006 or 1008, it's likely an auth error
                    if (event.code === 1006 || event.code === 1008) {
                        logger.error("WebSocket closed with auth error:", event.code, event.reason);
                        resolve(false);
                    }
                };
            });
        } catch (error) {
            logger.error("TTS configuration test failed:", error);
            return false;
        }
    };

    const handleTest = async () => {
        if (!apiKey || !validateMurfApiKey(apiKey)) {
            setTestResult(false);
            return;
        }

        setIsTesting(true);
        try {
            const result = await testTTSConfiguration();
            setTestResult(result);
        } catch (error) {
            logger.error("Test failed:", error);
            setTestResult(false);
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = useCallback(() => {
        setTTSConfig({
            enabled: true,
            provider,
            apiKey,
            voiceId: voiceId || undefined,
            style: voiceStyle,
            rate: speed,
            pitch,
            volume,
        });
        toast.success("TTS settings saved successfully");
    }, [provider, voiceId, voiceStyle, speed, pitch, volume, apiKey, setTTSConfig]);

    const handleRemove = useCallback(() => {
        setTTSConfig({
            enabled: false,
            provider: 'murf'
        });
        setTestResult(null);
        toast.success("TTS settings removed");
    }, [setTTSConfig]);

    const playTestAudio = async () => {
        if (!apiKey || !validateMurfApiKey(apiKey)) {
            toast.error("Please enter a valid API key first");
            return;
        }

        if (!voiceId) {
            toast.error("Please select a voice first");
            return;
        }

        setIsPlayingAudio(true);

        try {
            // Create WebSocket connection with proper parameters
            const wsUrl = `wss://api.murf.ai/v1/speech/stream-input?api-key=${encodeURIComponent(apiKey)}&sample_rate=44100&channel_type=MONO&format=WAV`;
            const ws = new WebSocket(wsUrl);
            
            // Create audio context for playback
            const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const audioChunks: ArrayBuffer[] = [];
            
            ws.onopen = () => {
                // Send test text with proper Murf API format
                const testMessage = {
                    context_id: `audio-test-${Date.now()}`,
                    voice_config: {
                        voiceId: voiceId,
                        style: voiceStyle,
                        rate: speed - 1, // Murf expects 0 for normal, -1 for slower, +1 for faster
                        pitch: pitch - 1, // Same adjustment for pitch
                        variation: 1
                    },
                    text: "Hello! This is a test of the Murf text to speech system.",
                    end: true
                };
                ws.send(JSON.stringify(testMessage));
            };

            ws.onmessage = async (event) => {
                if (typeof event.data === 'string') {
                    try {
                        const data = JSON.parse(event.data);
                        
                        // Check if this is an audio chunk
                        if (data.audio) {
                            // Decode base64 audio data
                            const base64Audio = data.audio;
                            
                            // Remove data URL prefix if present
                            const base64Clean = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
                            
                            // Convert base64 to binary
                            const binaryString = atob(base64Clean);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            
                            // Add to audio chunks
                            audioChunks.push(bytes.buffer);
                        }
                        
                        // Check if this is the final message (Murf sends {"final": true})
                        if (data.final === true) {
                            
                            // Combine all audio chunks and play
                            if (audioChunks.length > 0) {
                                const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
                                
                                const combinedBuffer = new ArrayBuffer(totalLength);
                                const view = new Uint8Array(combinedBuffer);
                                let offset = 0;
                                
                                for (const chunk of audioChunks) {
                                    view.set(new Uint8Array(chunk), offset);
                                    offset += chunk.byteLength;
                                }
                                
                                // Decode and play the audio
                                try {
                                    const audioBuffer = await audioContext.decodeAudioData(combinedBuffer);
                                    
                                    const source = audioContext.createBufferSource();
                                    source.buffer = audioBuffer;
                                    
                                    // Apply volume
                                    const gainNode = audioContext.createGain();
                                    gainNode.gain.value = volume;
                                    
                                    source.connect(gainNode);
                                    gainNode.connect(audioContext.destination);
                                    
                                    // Add ended event listener
                                    source.onended = () => {
                                        setIsPlayingAudio(false);
                                    };
                                    
                                    source.start(0);
                                } catch (decodeError) {
                                    logger.error("Error decoding audio:", decodeError);
                                    toast.error("Failed to decode audio. The audio format may not be supported.");
                                    setIsPlayingAudio(false);
                                }
                            } else {
                                logger.warn("No audio chunks received!");
                                toast.error("No audio data received from Murf API");
                                setIsPlayingAudio(false);
                            }
                            ws.close();
                        } else if (data.error) {
                            logger.error("Murf API error:", data.error);
                            toast.error(`Murf API error: ${data.error}`);
                            setIsPlayingAudio(false);
                            ws.close();
                        }
                    } catch (e) {
                        logger.error("Error processing message:", e);
                    }
                } else if (event.data instanceof Blob) {
                    // Handle blob data if needed
                    const arrayBuffer = await event.data.arrayBuffer();
                    audioChunks.push(arrayBuffer);
                }
            };

            ws.onerror = (error) => {
                logger.error("WebSocket error:", error);
                toast.error("Failed to connect to Murf API. Please check your API key.");
                setIsPlayingAudio(false);
            };

            ws.onclose = (event) => {
                if (event.code !== 1000 && event.code !== 1005) {
                    logger.error("WebSocket closed unexpectedly:", event.code, event.reason);
                    if (event.code === 1006 || event.code === 1008) {
                        toast.error("Authentication failed. Please check your API key.");
                    }
                    setIsPlayingAudio(false);
                }
            };
        } catch (error) {
            logger.error("Failed to play test audio:", error);
            toast.error("Failed to play test audio. Please check the console for details.");
            setIsPlayingAudio(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold">Text-to-Speech Configuration</h2>
                <p className="text-muted-foreground">
                    Configure text-to-speech for audio output and voice responses
                </p>
                {hasUnsavedChanges && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-2">
                        You have unsaved changes. Click "Save Changes" to apply them.
                    </p>
                )}
            </div>

            <Card className="p-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tts-provider">Provider</Label>
                        <Select value={provider} disabled>
                            <SelectTrigger id="tts-provider">
                                <div className="flex items-center justify-between w-full">
                                    <span>Murf.ai</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="murf">Murf.ai</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Professional text-to-speech service with realistic AI voices
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tts-api-key">API Key</Label>
                        <div className="flex gap-2">
                            <Input
                                id="tts-api-key"
                                type="password"
                                placeholder="Enter your Murf.ai API key"
                                value={apiKey || ''}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    setApiKey(newValue);
                                    setTestResult(null);
                                }}
                                onKeyDown={(e) => {
                                    // Prevent any form submission on Enter
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                    }
                                }}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleTest}
                                disabled={!apiKey || isTesting}
                                className="shrink-0"
                            >
                                {isTesting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : testResult === true ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                    <TestTube className="w-4 h-4" />
                                )}
                                Test API
                            </Button>
                        </div>
                        {testResult === false && (
                            <p className="text-sm text-red-500">
                                API key test failed. Please check your key and try again.
                            </p>
                        )}
                        {!validateMurfApiKey(apiKey) && apiKey && (
                            <p className="text-sm text-yellow-600">
                                API key format may be incorrect for Murf.ai
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                            Get your API key from{" "}
                            <a
                                href="https://murf.ai/api/docs"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Murf.ai API Dashboard
                            </a>
                        </p>
                    </div>

                    {/* Voice Selection - only show if API key is valid */}
                    {apiKey && validateMurfApiKey(apiKey) ? (
                        <VoiceSelector 
                            value={voiceId}
                            onValueChange={(value) => {
                                setVoiceId(value);
                                // Update style options based on selected voice (if using dynamic voices)
                                const selectedVoice = voices.find(v => v.voiceId === value);
                                if (selectedVoice?.availableStyles && selectedVoice.availableStyles.length > 0) {
                                    setVoiceStyle(selectedVoice.availableStyles[0]!);
                                }
                                // Update language based on selected voice
                                if (selectedVoice?.locale) {
                                    setLanguage(selectedVoice.locale);
                                }
                            }}
                            label="Voice"
                            disabled={false}
                            apiKey={apiKey}
                        />
                    ) : (
                        <div className="space-y-2">
                            <Label>Voice</Label>
                            <div className="p-3 border border-border rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground">
                                    Enter a valid API key to select voices
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Add Style selection if the selected voice has multiple styles */}
                    {(() => {
                        const selectedVoice = voices.find(v => v.voiceId === voiceId);
                        if (selectedVoice?.availableStyles && selectedVoice.availableStyles.length > 0) {
                            return (
                                <div className="space-y-2">
                                    <Label htmlFor="tts-style">Voice Style</Label>
                                    <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                                        <SelectTrigger id="tts-style">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedVoice.availableStyles.map((style) => (
                                                <SelectItem key={style} value={style}>
                                                    {style}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="space-y-2">
                        <Label htmlFor="tts-language">Language</Label>
                        <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger id="tts-language">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LANGUAGES.map((lang) => (
                                    <SelectItem key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tts-speed">Speed</Label>
                                <Input
                                    id="tts-speed"
                                    type="number"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={speed}
                                    onChange={(e) => setSpeed(parseFloat(e.target.value) || 1.0)}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">0.5x - 2.0x</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tts-pitch">Pitch</Label>
                                <Input
                                    id="tts-pitch"
                                    type="number"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={pitch}
                                    onChange={(e) => setPitch(parseFloat(e.target.value) || 1.0)}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">0.5x - 2.0x</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tts-volume">Volume</Label>
                                <Input
                                    id="tts-volume"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="10"
                                    value={Math.round(volume * 100)}
                                    onChange={(e) => setVolume((parseFloat(e.target.value) || 100) / 100)}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">0% - 100%</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Audio Test</Label>
                        <Button
                            variant="outline"
                            onClick={playTestAudio}
                            disabled={!apiKey || !validateMurfApiKey(apiKey) || !voiceId || isPlayingAudio}
                            className="flex items-center gap-2"
                        >
                            {isPlayingAudio ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Playing Audio...
                                </>
                            ) : (
                                <>
                                    <Volume2 className="w-4 h-4" />
                                    Play Test Audio
                                </>
                            )}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Test the TTS output with your selected voice and settings
                        </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={!apiKey || testResult === false}
                            className="flex-1"
                            variant={hasUnsavedChanges ? "default" : "outline"}
                        >
                            {hasUnsavedChanges ? "Save Changes" : "Save TTS Configuration"}
                        </Button>
                        {currentConfig && (
                            <Button variant="outline" onClick={handleRemove}>
                                Remove
                            </Button>
                        )}
                    </div>

                    {currentConfig && currentConfig.enabled && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium mb-2">Current Configuration</h4>
                            <div className="text-sm space-y-1">
                                <p>
                                    <span className="font-medium">Provider:</span> Murf.ai
                                </p>
                                <p>
                                    <span className="font-medium">Voice:</span>{" "}
                                    {(() => {
                                        // Use voices from the local state
                                        const dynamicVoice = voices.find((v) => v.voiceId === currentConfig.voiceId);
                                        return dynamicVoice?.displayName || currentConfig.voiceId || "Not selected";
                                    })()}
                                </p>
                                {language && (
                                    <p>
                                        <span className="font-medium">Language:</span>{" "}
                                        {LANGUAGES.find((l) => l.code === language)
                                            ?.name || language}
                                    </p>
                                )}
                                <p>
                                    <span className="font-medium">Speed:</span>{" "}
                                    {currentConfig.rate?.toFixed(1) || "1.0"}x
                                </p>
                                <p>
                                    <span className="font-medium">Pitch:</span>{" "}
                                    {currentConfig.pitch?.toFixed(1) || "1.0"}x
                                </p>
                                <p>
                                    <span className="font-medium">Volume:</span>{" "}
                                    {Math.round((currentConfig.volume || 1.0) * 100)}%
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}