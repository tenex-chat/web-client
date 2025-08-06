import { useState, useCallback } from 'react';

interface MurfTTSOptions {
    apiKey: string;
    voiceId: string;
    style?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

interface MurfTTSResult {
    isPlaying: boolean;
    play: (text: string) => Promise<void>;
    stop: () => void;
    error: string | null;
}

export function useMurfTTS(options: MurfTTSOptions): MurfTTSResult {
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentWebSocket, setCurrentWebSocket] = useState<WebSocket | null>(null);
    const [audioQueue, setAudioQueue] = useState<AudioBufferSourceNode[]>([]);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const stop = useCallback(() => {
        // Stop all queued audio sources
        audioQueue.forEach(source => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) {
                // Already stopped
            }
        });
        setAudioQueue([]);
        
        if (currentWebSocket && currentWebSocket.readyState === WebSocket.OPEN) {
            currentWebSocket.close();
            setCurrentWebSocket(null);
        }
        
        setIsPlaying(false);
        setIsProcessing(false);
    }, [audioQueue, currentWebSocket]);

    const play = useCallback(async (text: string): Promise<void> => {
        if (!options.apiKey || !options.voiceId) {
            setError('API key and voice ID are required');
            return;
        }

        // Stop any existing playback
        stop();
        
        setIsPlaying(true);
        setError(null);
        setIsProcessing(true);

        try {
            // Create WebSocket connection
            const wsUrl = `wss://api.murf.ai/v1/speech/stream-input?api-key=${encodeURIComponent(
                options.apiKey
            )}&sample_rate=44100&channel_type=MONO&format=WAV`;
            
            const ws = new WebSocket(wsUrl);
            setCurrentWebSocket(ws);
            
            // Create audio context for playback
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            setAudioContext(ctx);
            
            // Track audio chunks
            const audioChunks: ArrayBuffer[] = [];
            let isFirstChunk = true;
            
            ws.onopen = () => {
                const message = {
                    context_id: `tts-${Date.now()}`,
                    voice_config: {
                        voiceId: options.voiceId,
                        style: options.style || 'Conversational',
                        rate: (options.rate || 1.0) - 1, // Murf expects 0 for normal
                        pitch: (options.pitch || 1.0) - 1,
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
                        
                        // Collect audio chunks
                        if (data.audio) {
                            const base64Clean = data.audio.replace(/^data:audio\/\w+;base64,/, '');
                            const binaryString = atob(base64Clean);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            
                            // Just collect all chunks as-is for now
                            audioChunks.push(bytes.buffer);
                            console.log(`Received audio chunk ${audioChunks.length}, size: ${bytes.length} bytes`);
                            if (isFirstChunk && bytes.length > 44) {
                                // Log first few bytes to check for WAV header
                                const header = Array.from(bytes.slice(0, 4)).map(b => String.fromCharCode(b)).join('');
                                console.log(`First chunk header: "${header}" (expecting "RIFF" for WAV)`);
                                isFirstChunk = false;
                            }
                        }
                        
                        // Handle completion - combine and play all chunks
                        if (data.final === true || data.isFinalAudio === true) {
                            setIsProcessing(false);
                            
                            if (audioChunks.length > 0) {
                                // Combine all chunks
                                const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
                                const combinedBuffer = new ArrayBuffer(totalLength);
                                const view = new Uint8Array(combinedBuffer);
                                let offset = 0;
                                
                                for (const chunk of audioChunks) {
                                    view.set(new Uint8Array(chunk), offset);
                                    offset += chunk.byteLength;
                                }
                                
                                // Decode and play the combined audio
                                try {
                                    console.log(`Decoding combined audio: ${combinedBuffer.byteLength} bytes total`);
                                    const audioBuffer = await ctx.decodeAudioData(combinedBuffer);
                                    const source = ctx.createBufferSource();
                                    source.buffer = audioBuffer;
                                    
                                    // Apply volume
                                    const gainNode = ctx.createGain();
                                    gainNode.gain.value = options.volume || 1.0;
                                    
                                    source.connect(gainNode);
                                    gainNode.connect(ctx.destination);
                                    
                                    // Add to queue for cleanup
                                    setAudioQueue([source]);
                                    
                                    // Handle when playback ends
                                    source.onended = () => {
                                        setAudioQueue([]);
                                        setIsPlaying(false);
                                    };
                                    
                                    source.start(0);
                                } catch (decodeError) {
                                    console.error('Error decoding audio:', decodeError);
                                    setError('Failed to decode audio');
                                    setIsPlaying(false);
                                }
                            } else {
                                setIsPlaying(false);
                            }
                            
                            ws.close();
                        }
                        
                        if (data.error) {
                            setError(data.error);
                            setIsPlaying(false);
                            setIsProcessing(false);
                            ws.close();
                        }
                    } catch (e) {
                        console.error('Error processing message:', e);
                    }
                } else if (event.data instanceof Blob) {
                    // Handle blob data if needed
                    const arrayBuffer = await event.data.arrayBuffer();
                    audioChunks.push(arrayBuffer);
                }
            };

            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('Failed to connect to Murf API');
                setIsPlaying(false);
                setIsProcessing(false);
            };

            ws.onclose = (event) => {
                setCurrentWebSocket(null);
                setIsProcessing(false);
                if (event.code !== 1000 && event.code !== 1005) {
                    if (event.code === 1006 || event.code === 1008) {
                        setError('Authentication failed');
                    }
                    setIsPlaying(false);
                }
            };
        } catch (err) {
            console.error('Failed to play TTS:', err);
            setError('Failed to play audio');
            setIsPlaying(false);
            setIsProcessing(false);
        }
    }, [options, stop, isProcessing]);

    return {
        isPlaying,
        play,
        stop,
        error
    };
}

// Utility function to fetch Murf voices
export async function fetchMurfVoices(apiKey: string) {
    try {
        const response = await fetch('https://api.murf.ai/v1/speech/voices', {
            method: 'GET',
            headers: {
                'api-key': apiKey,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch voices: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Murf voices:', error);
        throw error;
    }
}