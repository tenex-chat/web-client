import { create } from "zustand";

export type ThreadViewMode = 'threaded' | 'flattened';

interface ThreadViewModeStore {
  mode: ThreadViewMode;
  setMode: (mode: ThreadViewMode) => void;
}

export const useThreadViewModeStore = create<ThreadViewModeStore>((set) => ({
  mode: 'threaded', // Default mode
  setMode: (mode) => set({ mode }),
}));