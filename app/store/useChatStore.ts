import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export interface ChatMessage {
  id: string
  text: string
  sender: "user" | "ai"
  timestamp: Date
  isAudio?: boolean
  audioUrl?: string
}

interface ChatState {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              // Ensure timestamp is a Date object when adding
              timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
            },
          ],
        })),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      // Transform the data when hydrating from storage to ensure timestamps are Date objects
      partialize: (state) => ({
        messages: state.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        })),
      }),
      // Transform the data when hydrating from storage to ensure timestamps are Date objects
      onRehydrateStorage: () => (state) => {
        if (state && state.messages) {
          state.messages = state.messages.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          }))
        }
      },
    },
  ),
)

