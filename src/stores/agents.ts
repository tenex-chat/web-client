import { create } from "zustand";

interface GlobalAgent {
  pubkey: string;
  slug: string;
}

interface AgentsState {
  globalAgents: Map<string, GlobalAgent>;
  globalAgentsArray: GlobalAgent[]; // Cached array version

  addGlobalAgent: (pubkey: string, slug: string) => void;
  clearGlobalAgents: () => void;
}

// Initial empty array that's stable
const INITIAL_GLOBAL_AGENTS: GlobalAgent[] = [];

export const useAgentsStore = create<AgentsState>((set) => ({
  globalAgents: new Map(),
  globalAgentsArray: INITIAL_GLOBAL_AGENTS,

  addGlobalAgent: (pubkey: string, slug: string) =>
    set((state) => {
      const newGlobalAgents = new Map(state.globalAgents);
      if (!newGlobalAgents.has(pubkey)) {
        newGlobalAgents.set(pubkey, { pubkey, slug });
        // Update the cached array
        const globalAgentsArray = Array.from(newGlobalAgents.values());
        return { globalAgents: newGlobalAgents, globalAgentsArray };
      }
      return state; // No change if agent already exists
    }),

  clearGlobalAgents: () =>
    set({
      globalAgents: new Map(),
      globalAgentsArray: INITIAL_GLOBAL_AGENTS,
    }),
}));

// Selector to get global agents as array - now returns the cached version
export const useGlobalAgents = () => {
  const agents = useAgentsStore((state) => state.globalAgentsArray);
  return agents;
};
