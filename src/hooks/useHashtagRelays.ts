import { useState, useCallback } from 'react';

const STORAGE_KEY = 'hashtag_relays_config';
const DEFAULT_RELAYS = ['wss://relay.primal.net'];

export function useHashtagRelays() {
  const [relays, setRelays] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle old format with enabled flag
        if (typeof parsed === 'object' && 'relays' in parsed) {
          return parsed.relays;
        }
        // Handle new format (just array)
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load hashtag relay config:', error);
    }
    return DEFAULT_RELAYS;
  });

  const updateRelays = useCallback((newRelays: string[]) => {
    setRelays(newRelays);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRelays));
  }, []);

  const addRelay = useCallback((url: string) => {
    if (!relays.includes(url)) {
      updateRelays([...relays, url]);
    }
  }, [relays, updateRelays]);

  const removeRelay = useCallback((url: string) => {
    updateRelays(relays.filter(r => r !== url));
  }, [relays, updateRelays]);

  return {
    relays,
    allRelays: relays, // Keep for backward compatibility
    addRelay,
    removeRelay,
    updateRelays,
  };
}