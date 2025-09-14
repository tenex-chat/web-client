import { useState, useEffect, useCallback } from 'react';
import { useNDK } from '@nostr-dev-kit/ndk-react';
import { NDKRelay } from '@nostr-dev-kit/ndk';

interface HashtagRelayConfig {
  relays: string[];
  enabled: boolean;
}

const STORAGE_KEY = 'hashtag_relays_config';
const DEFAULT_RELAYS = ['wss://relay.primal.net'];

export function useHashtagRelays() {
  const { ndk } = useNDK();
  const [config, setConfig] = useState<HashtagRelayConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load hashtag relay config:', error);
    }
    return {
      relays: DEFAULT_RELAYS,
      enabled: true,
    };
  });

  // Add relays to NDK pool when they change
  useEffect(() => {
    if (!ndk || !config.enabled) return;

    const addedRelays: NDKRelay[] = [];

    for (const url of config.relays) {
      try {
        // Check if relay already exists in pool
        let relay = ndk.pool.relays.get(url);
        
        if (!relay) {
          // Create and add new relay
          relay = new NDKRelay(url);
          ndk.pool.addRelay(relay);
          addedRelays.push(relay);
          console.log(`Added hashtag relay to pool: ${url}`);
        }
      } catch (error) {
        console.error(`Failed to add relay ${url}:`, error);
      }
    }

    // Note: We don't remove relays when they're removed from config
    // as they might be used by other features
  }, [ndk, config.relays, config.enabled]);

  const updateRelays = useCallback((relays: string[]) => {
    const newConfig = { ...config, relays };
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  }, [config]);

  const setEnabled = useCallback((enabled: boolean) => {
    const newConfig = { ...config, enabled };
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  }, [config]);

  const addRelay = useCallback((url: string) => {
    if (!config.relays.includes(url)) {
      updateRelays([...config.relays, url]);
    }
  }, [config.relays, updateRelays]);

  const removeRelay = useCallback((url: string) => {
    updateRelays(config.relays.filter(r => r !== url));
  }, [config.relays, updateRelays]);

  return {
    relays: config.enabled ? config.relays : [],
    allRelays: config.relays,
    enabled: config.enabled,
    setEnabled,
    addRelay,
    removeRelay,
    updateRelays,
  };
}