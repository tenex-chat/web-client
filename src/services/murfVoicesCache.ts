import { MurfVoice } from '../hooks/useMurfVoices';
import { logger } from '../lib/logger';

interface CachedVoices {
    voices: MurfVoice[];
    timestamp: number;
}

const CACHE_KEY = 'murf_voices_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

export class MurfVoicesCache {
    static get(): MurfVoice[] | null {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const data: CachedVoices = JSON.parse(cached);
            const now = Date.now();

            // Check if cache is expired
            if (now - data.timestamp > CACHE_DURATION) {
                this.clear();
                return null;
            }

            return data.voices;
        } catch (error) {
            logger.error('Error reading Murf voices cache:', error);
            return null;
        }
    }

    static set(voices: MurfVoice[]): void {
        try {
            const data: CachedVoices = {
                voices,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (error) {
            logger.error('Error saving Murf voices to cache:', error);
        }
    }

    static clear(): void {
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (error) {
            logger.error('Error clearing Murf voices cache:', error);
        }
    }

    static isExpired(): boolean {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return true;

            const data: CachedVoices = JSON.parse(cached);
            const now = Date.now();

            return now - data.timestamp > CACHE_DURATION;
        } catch (error) {
            return true;
        }
    }
}