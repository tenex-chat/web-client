import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { MurfTTSService, createMurfTTS, type MurfTTSConfig } from '@/services/murfTTS';

interface MurfTTSOptions extends MurfTTSConfig {
    enabled?: boolean;
}

interface MurfTTSResult {
    isPlaying: boolean;
    isPaused: boolean;
    play: (text: string) => Promise<void>;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    error: string | null;
}

export function useMurfTTS(options?: MurfTTSOptions | null): MurfTTSResult {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const serviceRef = useRef<MurfTTSService | null>(null);

    // Initialize or update service when options change
    useEffect(() => {
        if (!options?.enabled || !options?.apiKey || !options?.voiceId) {
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
    }, [options?.enabled, options?.apiKey, options?.voiceId, options?.style, options?.rate, options?.pitch, options?.volume]);

    const pause = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.pause();
            setIsPaused(true);
        }
    }, []);

    const resume = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.resume();
            setIsPaused(false);
        }
    }, []);

    const stop = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.stop();
        }
        setIsPlaying(false);
        setIsPaused(false);
    }, []);

    const play = useCallback(async (text: string): Promise<void> => {
        if (!options?.enabled) {
            return;
        }

        if (!options?.apiKey || !options?.voiceId) {
            setError('API key and voice ID are required');
            return;
        }

        if (!serviceRef.current) {
            setError('TTS service not initialized');
            return;
        }

        setIsPlaying(true);
        setIsPaused(false);
        setError(null);

        try {
            await serviceRef.current.speak(text);
            setIsPlaying(false);
            setIsPaused(false);
        } catch (err) {
            logger.error('Failed to play TTS:', err);
            setError(err instanceof Error ? err.message : 'Failed to play audio');
            setIsPlaying(false);
            setIsPaused(false);
        }
    }, [options?.enabled, options?.apiKey, options?.voiceId]);

    return {
        isPlaying,
        isPaused,
        play,
        pause,
        resume,
        stop,
        error
    };
}