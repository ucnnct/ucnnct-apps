import { create } from "zustand";

interface MessagesStoreState {
  selectedChatId: number;
  hasWsActivity: boolean;
  selectChat: (chatId: number) => void;
  markWsActivity: () => void;
  resetWsActivity: () => void;
}

export const useMessagesStore = create<MessagesStoreState>((set) => ({
  selectedChatId: 1,
  hasWsActivity: false,

  selectChat: (chatId) => {
    set({ selectedChatId: chatId });
  },

  markWsActivity: () => {
    set({ hasWsActivity: true });
  },

  resetWsActivity: () => {
    set({ hasWsActivity: false });
  },
}));
