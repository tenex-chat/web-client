import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { MurfTTSService, createMurfTTS, type MurfTTSConfig } from '@/services/murfTTS';

interface MurfTTSOptions extends MurfTTSConfig {
    enabled?: boolean;
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
    const serviceRef = useRef<MurfTTSService | null>(null);

    // Initialize or update service when options change
    useEffect(() => {
        if (!options.enabled || !options.apiKey || !options.voiceId) {
            if (serviceRef.current) {
                serviceRef.current.dispose();
                serviceRef.current = null;
            }
            return;
        }

        if (!serviceRef.current) {
            serviceRef.current = createMurfTTS(options);
        } else {
            serviceRef.current.updateConfig(options);
        }

        return () => {
            if (serviceRef.current) {
                serviceRef.current.dispose();
                serviceRef.current = null;
            }
        };
    }, [options.enabled, options.apiKey, options.voiceId, options.style, options.rate, options.pitch, options.volume]);

    const stop = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.stop();
        }
        setIsPlaying(false);
    }, []);

    const play = useCallback(async (text: string): Promise<void> => {
        if (!options.enabled) {
            return;
        }

        if (!options.apiKey || !options.voiceId) {
            setError('API key and voice ID are required');
            return;
        }

        if (!serviceRef.current) {
            setError('TTS service not initialized');
            return;
        }

        setIsPlaying(true);
        setError(null);

        try {
            await serviceRef.current.speak(text);
            setIsPlaying(false);
        } catch (err) {
            logger.error('Failed to play TTS:', err);
            setError(err instanceof Error ? err.message : 'Failed to play audio');
            setIsPlaying(false);
        }
    }, [options.enabled, options.apiKey, options.voiceId]);

    return {
        isPlaying,
        play,
        stop,
        error
    };
}