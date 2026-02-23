import {
  maxMessageStatus,
  normalizeMessageStatus,
  refreshConversationPresentation,
  resolveMessageContent,
  resolveUserDisplayName,
  upsertMessage,
} from "./mappers";
import type {
  MessageConversationItem,
  MessageItem,
  MessagesStoreState,
} from "./types";
import type { MessagesGet, MessagesHydrators, MessagesSet } from "./storeContext";
import {
  cleanupTypingState,
  DEFAULT_TYPING_TTL_MS,
  MAX_TYPING_TTL_MS,
} from "./storeRuntime";
import {
  isNonBlankString,
  makeTransientMessageId,
  resolveConversationRef,
  sortConversations,
  uniqueNonBlank,
} from "./utils";

type RealtimeActions = Pick<
  MessagesStoreState,
  | "ingestWsMessage"
  | "ingestWsMessageAck"
  | "ingestTypingUpdate"
  | "pruneExpiredTyping"
  | "ingestPresenceUpdate"
>;

export function createMessagesRealtimeActions(
  set: MessagesSet,
  _get: MessagesGet,
  hydrators: MessagesHydrators,
): RealtimeActions {
  const { hydrateUsers, hydrateGroups } = hydrators;

  return {
    ingestWsMessage: (payload, authUser) => {
      if (!authUser?.sub) {
        return;
      }

      const conversationRef = resolveConversationRef(payload, authUser.sub);
      if (!conversationRef) {
        return;
      }

      const senderId = isNonBlankString(payload.senderId) ? payload.senderId : authUser.sub;
      const participantIds = uniqueNonBlank([
        senderId,
        authUser.sub,
        ...(payload.receiversId ?? []),
      ]);

      const messageId = isNonBlankString(payload.messageId)
        ? payload.messageId
        : makeTransientMessageId();
      const messageCreatedAt = new Date().toISOString();
      const messageContent =
        resolveMessageContent(payload.content, payload.objectKey, false) || "Nouveau message";
      const normalizedPayloadStatus = normalizeMessageStatus(payload.status);

      set((state) => {
        const isOwnMessage = senderId === authUser.sub;
        const defaultStatus = isOwnMessage ? "SENT" : "DELIVERED";
        const nextMessage: MessageItem = {
          id: messageId,
          conversationId: conversationRef.conversationId,
          senderId,
          senderLabel: resolveUserDisplayName(senderId, state.userDirectory),
          content: messageContent,
          objectKey: isNonBlankString(payload.objectKey) ? payload.objectKey : undefined,
          isOwn: isOwnMessage,
          status: maxMessageStatus(defaultStatus, normalizedPayloadStatus),
          createdAt: messageCreatedAt,
        };

        const existingConversation = state.conversations.find(
          (conversation) => conversation.id === conversationRef.conversationId,
        );
        const shouldIncreaseUnread =
          !nextMessage.isOwn && state.selectedConversationId !== conversationRef.conversationId;

        const baseConversation: MessageConversationItem =
          existingConversation ??
          {
            id: conversationRef.conversationId,
            kind: conversationRef.kind,
            title:
              conversationRef.kind === "group"
                ? conversationRef.groupId && state.groupDirectory[conversationRef.groupId]
                  ? state.groupDirectory[conversationRef.groupId].name
                  : conversationRef.groupId
                    ? `Groupe ${conversationRef.groupId.slice(0, 8)}`
                    : "Groupe"
                : conversationRef.peerUserId && state.userDirectory[conversationRef.peerUserId]
                  ? state.userDirectory[conversationRef.peerUserId].displayName
                  : conversationRef.peerUserId
                    ? `Utilisateur ${conversationRef.peerUserId.slice(0, 8)}`
                    : "Conversation",
            subtitle:
              conversationRef.kind === "group"
                ? "Conversation de groupe"
                : conversationRef.peerUserId && state.userDirectory[conversationRef.peerUserId]
                  ? state.userDirectory[conversationRef.peerUserId].handle
                  : "Conversation privee",
            avatarSeeds: [],
            participantIds,
            peerUserId: conversationRef.peerUserId,
            groupId: conversationRef.groupId,
            unreadCount: 0,
            lastMessagePreview: "Nouveau message",
            lastMessageAt: null,
          };

        const mergedParticipantIds = uniqueNonBlank([
          ...baseConversation.participantIds,
          ...participantIds,
        ]);

        const updatedConversation: MessageConversationItem = {
          ...baseConversation,
          participantIds: mergedParticipantIds,
          unreadCount:
            state.selectedConversationId === conversationRef.conversationId
              ? 0
              : baseConversation.unreadCount + (shouldIncreaseUnread ? 1 : 0),
          lastMessagePreview: messageContent,
          lastMessageAt: messageCreatedAt,
        };

        const presentedConversation = refreshConversationPresentation(
          updatedConversation,
          state.activeUserId,
          state.userDirectory,
          state.groupDirectory,
        );

        const nextConversations = sortConversations([
          presentedConversation,
          ...state.conversations.filter(
            (conversation) => conversation.id !== conversationRef.conversationId,
          ),
        ]);

        const existingMessages = state.messagesByConversationId[conversationRef.conversationId] ?? [];
        const existingMessage = existingMessages.find((message) => message.id === nextMessage.id);
        if (existingMessage) {
          nextMessage.status = maxMessageStatus(existingMessage.status, nextMessage.status);
        }

        const nextMessagesByConversationId = {
          ...state.messagesByConversationId,
          [conversationRef.conversationId]: upsertMessage(existingMessages, nextMessage),
        };

        return {
          conversations: nextConversations,
          messagesByConversationId: nextMessagesByConversationId,
        };
      });

      const idsToHydrate = uniqueNonBlank([
        senderId,
        conversationRef.peerUserId,
        ...(conversationRef.kind === "group" ? payload.receiversId ?? [] : []),
      ]).filter((id) => id !== authUser.sub);

      void hydrateUsers(idsToHydrate);
      if (conversationRef.groupId) {
        void hydrateGroups([conversationRef.groupId]);
      }
    },

    ingestWsMessageAck: (payload, actionType, authUserId) => {
      if (!isNonBlankString(authUserId)) {
        return;
      }

      const messageId = payload.messageId?.trim();
      if (!messageId) {
        return;
      }

      const resolvedStatus = (() => {
        switch (actionType) {
          case "MESSAGE_READ_CONFIRMED":
          case "GROUP_MESSAGE_READ_CONFIRMED":
            return "READ" as const;
          case "MESSAGE_RECEIVED_CONFIRMED":
          case "GROUP_MESSAGE_RECEIVED_CONFIRMED":
            return "DELIVERED" as const;
          default:
            return normalizeMessageStatus(payload.status);
        }
      })();

      set((state) => {
        let changed = false;
        const nextMessagesByConversationId: Record<string, MessageItem[]> = {};

        for (const [conversationId, messages] of Object.entries(state.messagesByConversationId)) {
          const updatedMessages = messages.map((message) => {
            if (message.id !== messageId || message.senderId !== authUserId) {
              return message;
            }

            const nextStatus = maxMessageStatus(message.status, resolvedStatus);
            if (nextStatus === message.status) {
              return message;
            }

            changed = true;
            return {
              ...message,
              status: nextStatus,
            };
          });

          nextMessagesByConversationId[conversationId] = updatedMessages;
        }

        if (!changed) {
          return state;
        }

        return {
          messagesByConversationId: nextMessagesByConversationId,
        };
      });
    },

    ingestTypingUpdate: (payload, authUserId) => {
      if (!isNonBlankString(authUserId)) {
        return;
      }

      const conversationId = payload.conversationId?.trim() ?? "";
      const senderId = payload.senderId?.trim() ?? "";
      const isTyping = payload.isTyping;
      if (
        !isNonBlankString(conversationId) ||
        !isNonBlankString(senderId) ||
        senderId === authUserId ||
        typeof isTyping !== "boolean"
      ) {
        return;
      }

      const requestedTtlMs =
        typeof payload.ttlMs === "number" && Number.isFinite(payload.ttlMs)
          ? payload.ttlMs
          : DEFAULT_TYPING_TTL_MS;
      const ttlMs = Math.max(500, Math.min(MAX_TYPING_TTL_MS, requestedTtlMs));
      const now = Date.now();
      const expiresAt = now + ttlMs;

      set((state) => {
        const { nextTypingByConversationId, changed: cleanedChanged } = cleanupTypingState(
          state.typingByConversationId,
          now,
        );
        const nextConversationTyping = {
          ...(nextTypingByConversationId[conversationId] ?? {}),
        };

        if (isTyping) {
          nextConversationTyping[senderId] = expiresAt;
        } else {
          delete nextConversationTyping[senderId];
        }

        if (Object.keys(nextConversationTyping).length === 0) {
          delete nextTypingByConversationId[conversationId];
        } else {
          nextTypingByConversationId[conversationId] = nextConversationTyping;
        }

        if (!cleanedChanged && !isTyping && !(senderId in (state.typingByConversationId[conversationId] ?? {}))) {
          return state;
        }

        return {
          typingByConversationId: nextTypingByConversationId,
        };
      });
    },

    pruneExpiredTyping: () => {
      const now = Date.now();
      set((state) => {
        const { nextTypingByConversationId, changed } = cleanupTypingState(
          state.typingByConversationId,
          now,
        );
        if (!changed) {
          return state;
        }

        return {
          typingByConversationId: nextTypingByConversationId,
        };
      });
    },

    ingestPresenceUpdate: (payload) => {
      const normalizedUserId = payload.userId?.trim() ?? "";
      const online = payload.online;
      if (!isNonBlankString(normalizedUserId) || typeof online !== "boolean") {
        return;
      }
      const userId = normalizedUserId;

      set((state) => {
        const currentValue = state.presenceByUserId[userId];
        if (currentValue === online) {
          return state;
        }

        return {
          presenceByUserId: {
            ...state.presenceByUserId,
            [userId]: online,
          },
        };
      });
    },
  };
}
