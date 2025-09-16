import { create } from "zustand";
import { NDKProject } from "@/lib/ndk-events/NDKProject";

interface QuoteModalState {
  isOpen: boolean;
  quotedText: string;
  project: NDKProject | null;
  openQuote: (quotedText: string, project: NDKProject) => void;
  closeQuote: () => void;
}

export const useQuoteModal = create<QuoteModalState>((set) => ({
  isOpen: false,
  quotedText: "",
  project: null,
  openQuote: (quotedText: string, project: NDKProject) => {
    set({
      isOpen: true,
      quotedText,
      project,
    });
  },
  closeQuote: () => {
    set({
      isOpen: false,
      quotedText: "",
      project: null,
    });
  },
}));