import { logger } from '@/lib/logger';

export interface MurfTTSConfig {
    apiKey: string;
    voiceId: string;
    style?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

export interface MurfVoice {
    voiceId: string;
    displayName: string;
    gender: string;
    locale: string;
    accent?: string;
    description?: string;
    displayLanguage?: string;
    availableStyles?: string[];
}

export class MurfTTSService {
    private audioContext: AudioContext | null = null;
    private currentWebSocket: WebSocket | null = null;
    private currentAudioSource: AudioBufferSourceNode | null = null;

    constructor(private config: MurfTTSConfig) {
        // Initialize audio context lazily
    }

    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
        }
        return this.audioContext;
    }

    async speak(text: string): Promise<void> {
        // Stop any existing playback
        this.stop();

        return new Promise((resolve, reject) => {
            if (!this.config.apiKey || !this.config.voiceId) {
                reject(new Error('API key and voice ID are required'));
                return;
            }

            const wsUrl = `wss://api.murf.ai/v1/speech/stream-input?api-key=${encodeURIComponent(
                this.config.apiKey
            )}&sample_rate=44100&channel_type=MONO&format=WAV`;
            
            const ws = new WebSocket(wsUrl);
            this.currentWebSocket = ws;
            
            const audioChunks: ArrayBuffer[] = [];
            const audioContext = this.getAudioContext();
            let isFirstChunk = true;
            
            ws.onopen = () => {
                const message = {
                    context_id: `tts-${Date.now()}`,
                    voice_config: {
                        voiceId: this.config.voiceId,
                        style: this.config.style || 'Conversational',
                        rate: (this.config.rate || 1.0) - 1,
                        pitch: (this.config.pitch || 1.0) - 1,
                        variation: 1
                    },
                    text: text,
                    end: true
                };
                ws.send(JSON.stringify(message));
            };

            ws.onmessage = async (event) => {
                if (typeof event.data === 'string') {
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.audio) {
                            const base64Clean = data.audio.replace(/^data:audio\/\w+;base64,/, '');
                            const binaryString = atob(base64Clean);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            
                            // Skip WAV header (first 44 bytes) from the first chunk
                            if (isFirstChunk && bytes.length > 44) {
                                const audioWithoutHeader = bytes.buffer.slice(44);
                                audioChunks.push(audioWithoutHeader);
                                isFirstChunk = false;
                            } else {
                                audioChunks.push(bytes.buffer);
                            }
                        }
                        
                        if (data.final === true || data.isFinalAudio === true) {
                            if (audioChunks.length === 0) {
                                reject(new Error('No audio data received'));
                                ws.close();
                                return;
                            }

                            // Combine chunks
                            const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
                            const combinedBuffer = new ArrayBuffer(totalLength);
                            const view = new Uint8Array(combinedBuffer);
                            let offset = 0;
                            
                            for (const chunk of audioChunks) {
                                view.set(new Uint8Array(chunk), offset);
                                offset += chunk.byteLength;
                            }
                            
                            // Decode and play
                            try {
                                const audioBuffer = await audioContext.decodeAudioData(combinedBuffer);
                                const source = audioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                
                                const gainNode = audioContext.createGain();
                                gainNode.gain.value = this.config.volume || 1.0;
                                
                                source.connect(gainNode);
                                gainNode.connect(audioContext.destination);
                                
                                this.currentAudioSource = source;
                                
                                source.onended = () => {
                                    this.currentAudioSource = null;
                                    resolve();
                                };
                                
                                source.start(0);
                            } catch {
                                reject(new Error('Failed to decode audio'));
                            }
                            
                            ws.close();
                        }
                        
                        if (data.error) {
                            reject(new Error(data.error));
                            ws.close();
                        }
                    } catch {
                        logger.error('Error processing WebSocket message');
                    }
                }
            };

            ws.onerror = () => {
                reject(new Error('WebSocket connection failed'));
            };

            ws.onclose = (event) => {
                this.currentWebSocket = null;
                if (event.code === 1006 || event.code === 1008) {
                    reject(new Error('Authentication failed'));
                }
            };
        });
    }

    stop(): void {
        if (this.currentAudioSource) {
            try {
                this.currentAudioSource.stop();
                this.currentAudioSource.disconnect();
            } catch {
                // Already stopped
            }
            this.currentAudioSource = null;
        }
        
        if (this.currentWebSocket && this.currentWebSocket.readyState === WebSocket.OPEN) {
            this.currentWebSocket.close();
            this.currentWebSocket = null;
        }
    }

    async getVoices(): Promise<MurfVoice[]> {
        if (!this.config.apiKey) {
            throw new Error('API key is required to fetch voices');
        }

        const response = await fetch('https://api.murf.ai/v1/speech/voices', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.config.apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch voices: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    }

    updateConfig(config: Partial<MurfTTSConfig>): void {
        this.config = { ...this.config, ...config };
    }

    dispose(): void {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Factory function for easier instantiation
export function createMurfTTS(config: MurfTTSConfig): MurfTTSService {
    return new MurfTTSService(config);
}