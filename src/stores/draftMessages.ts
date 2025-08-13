import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DraftMessagesState {
  drafts: Record<string, string> // conversationId -> draft message
  setDraft: (conversationId: string, message: string) => void
  getDraft: (conversationId: string) => string | undefined
  clearDraft: (conversationId: string) => void
}

export const useDraftMessages = create<DraftMessagesState>()(
  persist(
    (set, get) => ({
      drafts: {},
      
      setDraft: (conversationId: string, message: string) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [conversationId]: message
          }
        }))
      },
      
      getDraft: (conversationId: string) => {
        return get().drafts[conversationId]
      },
      
      clearDraft: (conversationId: string) => {
        set((state) => {
          const { [conversationId]: _, ...rest } = state.drafts
          return { drafts: rest }
        })
      }
    }),
    {
      name: 'draft-messages-storage', // name of the item in localStorage
      partialize: (state) => ({ drafts: state.drafts }) // only persist drafts
    }
  )
)