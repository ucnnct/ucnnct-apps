import { create } from "zustand";
import { createMessagesConversationActions } from "./storeConversationActions";
import type { MessagesStoreState } from "./types";
import { createMessagesHydrators } from "./storeHydration";
import { createMessagesRealtimeActions } from "./storeRealtimeActions";

export const useMessagesStore = create<MessagesStoreState>((set, get) => {
  const hydrators = createMessagesHydrators(set, get);
  const conversationActions = createMessagesConversationActions(set, get, hydrators);
  const realtimeActions = createMessagesRealtimeActions(set, get, hydrators);

  return {
    activeUserId: null,
    loadingConversations: false,
    loadingMessagesByConversationId: {},
    loadedMessagesByConversationId: {},
    conversations: [],
    messagesByConversationId: {},
    presenceByUserId: {},
    typingByConversationId: {},
    selectedConversationId: null,
    userDirectory: {},
    groupDirectory: {},
    error: null,
    ...conversationActions,
    ...realtimeActions,
  };
});
