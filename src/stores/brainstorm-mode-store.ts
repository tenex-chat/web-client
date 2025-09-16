import { create } from "zustand";

interface BrainstormModeState {
  // Current brainstorm mode state (not persisted, only for new conversations)
  currentSession: {
    enabled: boolean;
    moderatorPubkey: string | null;
    participantPubkeys: string[];
  } | null;

  // Actions
  startBrainstormSession: () => void;
  clearBrainstormSession: () => void;
  setModerator: (moderatorPubkey: string) => void;
  toggleParticipant: (participantPubkey: string) => void;
  setParticipants: (participantPubkeys: string[]) => void;
  getCurrentSession: () => {
    enabled: boolean;
    moderatorPubkey: string | null;
    participantPubkeys: string[];
  } | null;
}

export const useBrainstormMode = create<BrainstormModeState>((set, get) => ({
  currentSession: null,

  startBrainstormSession: () =>
    set({
      currentSession: {
        enabled: true,
        moderatorPubkey: null,
        participantPubkeys: [],
      },
    }),

  clearBrainstormSession: () =>
    set({
      currentSession: null,
    }),

  setModerator: (moderatorPubkey) =>
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            moderatorPubkey,
          }
        : null,
    })),

  toggleParticipant: (participantPubkey) =>
    set((state) => {
      if (!state.currentSession) return state;
      
      const isSelected = state.currentSession.participantPubkeys.includes(participantPubkey);
      const newParticipants = isSelected
        ? state.currentSession.participantPubkeys.filter(p => p !== participantPubkey)
        : [...state.currentSession.participantPubkeys, participantPubkey];
      
      return {
        currentSession: {
          ...state.currentSession,
          participantPubkeys: newParticipants,
        },
      };
    }),

  setParticipants: (participantPubkeys) =>
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            participantPubkeys,
          }
        : null,
    })),

  getCurrentSession: () => get().currentSession,
}));