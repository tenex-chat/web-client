import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BrainstormViewState {
  showNotChosen: boolean; // Now means "show all messages" in brainstorm mode
  setShowNotChosen: (show: boolean) => void;
  toggleShowNotChosen: () => void;
}

/**
 * Store for managing brainstorm mode view preferences
 * Controls whether to show only moderator-selected events or all events in brainstorm conversations
 */
export const useBrainstormView = create<BrainstormViewState>()(
  persist(
    (set) => ({
      // Default to showing only moderator-selected events
      showNotChosen: false,

      setShowNotChosen: (show) => set({ showNotChosen: show }),

      toggleShowNotChosen: () => set((state) => {
        console.log('[BrainstormStore] Toggling showNotChosen from', state.showNotChosen, 'to', !state.showNotChosen);
        return {
          showNotChosen: !state.showNotChosen
        };
      }),
    }),
    {
      name: "brainstorm-view-preferences",
    }
  )
);