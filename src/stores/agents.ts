import { create } from 'zustand';

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
    
    addGlobalAgent: (pubkey: string, slug: string) => set((state) => {
        const newGlobalAgents = new Map(state.globalAgents);
        if (!newGlobalAgents.has(pubkey)) {
            console.log(`[AgentsStore] Adding new global agent: pubkey=${pubkey}, slug=${slug}`);
            newGlobalAgents.set(pubkey, { pubkey, slug });
            // Update the cached array
            const globalAgentsArray = Array.from(newGlobalAgents.values());
            console.log(`[AgentsStore] Total global agents after adding: ${globalAgentsArray.length}`);
            return { globalAgents: newGlobalAgents, globalAgentsArray };
        }
        console.log(`[AgentsStore] Global agent already exists: pubkey=${pubkey}`);
        return state; // No change if agent already exists
    }),
    
    clearGlobalAgents: () => set({ 
        globalAgents: new Map(),
        globalAgentsArray: INITIAL_GLOBAL_AGENTS 
    })
}));

// Selector to get global agents as array - now returns the cached version
export const useGlobalAgents = () => {
    const agents = useAgentsStore(state => state.globalAgentsArray);
    console.log(`[useGlobalAgents hook] Returning ${agents.length} global agents:`, agents);
    return agents;
};