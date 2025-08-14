import { MurfVoice } from './murfTTS';
import { logger } from '@/lib/logger';
import { Storage } from '@/lib/utils/storage';

interface CachedVoices {
    voices: MurfVoice[];
    timestamp: number;
}

const CACHE_KEY = 'murf_voices_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

export class MurfVoicesCache {
    static get(): MurfVoice[] | null {
        try {
            const data = Storage.getItem<CachedVoices>(CACHE_KEY);
            if (!data) return null;

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
            Storage.setItem(CACHE_KEY, data);
        } catch (error) {
            logger.error('Error saving Murf voices to cache:', error);
        }
    }

    static clear(): void {
        try {
            Storage.removeItem(CACHE_KEY);
        } catch (error) {
            logger.error('Error clearing Murf voices cache:', error);
        }
    }

    static isExpired(): boolean {
        try {
            const data = Storage.getItem<CachedVoices>(CACHE_KEY);
            if (!data) return true;

            const now = Date.now();

            return now - data.timestamp > CACHE_DURATION;
        } catch {
            return true;
        }
    }
}