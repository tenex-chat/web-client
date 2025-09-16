import { create } from "zustand";

interface ChatInputFocusState {
  focusCallback: (() => void) | null;
  setFocusCallback: (callback: (() => void) | null) => void;
  triggerFocus: () => void;
}

export const useChatInputFocus = create<ChatInputFocusState>((set, get) => ({
  focusCallback: null,
  setFocusCallback: (callback) => set({ focusCallback: callback }),
  triggerFocus: () => {
    const { focusCallback } = get();
    if (focusCallback) {
      focusCallback();
    }
  },
}));