import { useState, useEffect, useCallback } from "react";
const LOCAL_STORAGE_KEY = "projectMessagesRelays";
const DEFAULT_RELAYS = ["wss://relay.primal.net"];
export function useProjectMessagesRelays() {
  const [relays, setRelays] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const storedRelays = localStorage.getItem(LOCAL_STORAGE_KEY);
      return storedRelays ? storedRelays.split('\n').filter(Boolean) : DEFAULT_RELAYS;
    }
    return DEFAULT_RELAYS;
  });
  const updateRelays = useCallback((newRelayString: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, newRelayString);
      setRelays(newRelayString.split('\n').filter(Boolean));
    }
  }, []);
  const resetRelays = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setRelays(DEFAULT_RELAYS);
    }
  }, []);
  return { relays, updateRelays, resetRelays };
}