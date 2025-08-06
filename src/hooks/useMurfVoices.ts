import { useState, useEffect } from 'react';
import { fetchMurfVoices } from './useMurfTTS';
import { useLLMConfig } from './useLLMConfig';
import { MurfVoicesCache } from '../services/murfVoicesCache';

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

interface UseMurfVoicesReturn {
    voices: MurfVoice[];
    loading: boolean;
    error: Error | null;
}

export function useMurfVoices(apiKeyOverride?: string): UseMurfVoicesReturn {
    const [voices, setVoices] = useState<MurfVoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { config } = useLLMConfig();
    
    // Use provided API key if available, otherwise fall back to config
    const apiKey = apiKeyOverride || config?.murfApiKey;

    useEffect(() => {
        const loadVoices = async () => {
            if (!apiKey) {
                setLoading(false);
                setError(new Error('Murf API key not configured'));
                return;
            }

            try {
                setLoading(true);
                
                // Check cache first
                const cachedVoices = MurfVoicesCache.get();
                if (cachedVoices) {
                    setVoices(cachedVoices);
                    setError(null);
                    setLoading(false);
                    return;
                }
                
                // Fetch from API if not cached or expired
                const data = await fetchMurfVoices(apiKey);
                setVoices(data);
                setError(null);
                
                // Cache the fetched voices
                MurfVoicesCache.set(data);
            } catch (err) {
                console.error('Failed to fetch Murf voices:', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch voices'));
                setVoices([]);
            } finally {
                setLoading(false);
            }
        };

        loadVoices();
    }, [apiKey]);

    return { voices, loading, error };
}

// Helper function to get voice info
export function getVoiceInfo(voices: MurfVoice[], voiceId: string): MurfVoice | undefined {
    return voices.find(v => v.voiceId === voiceId);
}

// Helper function to extract country code from locale
export function getCountryFromLocale(locale: string): string {
    const parts = locale.split('-');
    return parts.length > 1 ? parts[1] : '';
}

// Helper function to extract language code from locale
export function getLanguageFromLocale(locale: string): string {
    const parts = locale.split('-');
    return parts[0] || locale;
}