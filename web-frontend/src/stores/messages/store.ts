import { create } from "zustand";
import { chatApi } from "../../api/chat";
import { groupApi, type GroupSummary } from "../../api/groups";
import { userApi } from "../../api/users";
import { DEFAULT_MESSAGE_PAGE_SIZE } from "./constants";
import {
  maxMessageStatus,
  mapConversationToItem,
  mapMessageToItem,
  normalizeMessageStatus,
  refreshConversationPresentation,
  resolveMessageContent,
  resolveUserDisplayName,
  toAuthUserDirectoryEntry,
  toGroupDirectoryEntry,
  toUserDirectoryEntry,
  upsertMessage,
} from "./mappers";
import type {
  GroupDirectoryEntry,
  MessageConversationItem,
  MessageItem,
  MessagesStoreState,
  UserDirectoryEntry,
} from "./types";
import {
  buildPeerConversationId,
  isNonBlankString,
  makeTransientMessageId,
  normalizeIsoDate,
  resolveConversationRef,
  sortConversations,
  sortMessages,
  uniqueNonBlank,
} from "./utils";

let conversationsLoadPromise: Promise<void> | null = null;
const messagesLoadPromises = new Map<string, Promise<void>>();
const userHydrationInFlight = new Set<string>();
const groupHydrationInFlight = new Set<string>();

export const useMessagesStore = create<MessagesStoreState>((set, get) => {
  const hydrateUsers = async (userIds: string[]): Promise<void> => {
    const dedupedIds = uniqueNonBlank(userIds);
    if (dedupedIds.length === 0) {
      return;
    }

    const missingIds = dedupedIds.filter((userId) => {
      if (userHydrationInFlight.has(userId)) {
        return false;
      }
      return !get().userDirectory[userId];
    });

    if (missingIds.length === 0) {
      return;
    }

    for (const userId of missingIds) {
      userHydrationInFlight.add(userId);
    }

    try {
      const profileResults = await Promise.allSettled(
        missingIds.map((userId) => userApi.getById(userId)),
      );
      const directoryEntries: UserDirectoryEntry[] = [];
      for (const result of profileResults) {
        if (result.status !== "fulfilled") {
          continue;
        }
        directoryEntries.push(toUserDirectoryEntry(result.value));
      }

      if (directoryEntries.length === 0) {
        return;
      }

      set((state) => {
        const nextUserDirectory = { ...state.userDirectory };
        for (const entry of directoryEntries) {
          nextUserDirectory[entry.id] = entry;
        }

        const nextConversations = sortConversations(
          state.conversations.map((conversation) =>
            refreshConversationPresentation(
              conversation,
              state.activeUserId,
              nextUserDirectory,
              state.groupDirectory,
            ),
          ),
        );

        const nextMessagesByConversationId: Record<string, MessageItem[]> = {};
        for (const [conversationId, messages] of Object.entries(state.messagesByConversationId)) {
          nextMessagesByConversationId[conversationId] = messages.map((message) => ({
            ...message,
            senderLabel: resolveUserDisplayName(message.senderId, nextUserDirectory),
          }));
        }

        return {
          userDirectory: nextUserDirectory,
          conversations: nextConversations,
          messagesByConversationId: nextMessagesByConversationId,
        };
      });
    } finally {
      for (const userId of missingIds) {
        userHydrationInFlight.delete(userId);
      }
    }
  };

  const hydrateGroups = async (groupIds: string[]): Promise<void> => {
    const dedupedIds = uniqueNonBlank(groupIds);
    if (dedupedIds.length === 0) {
      return;
    }

    const missingIds = dedupedIds.filter((groupId) => {
      if (groupHydrationInFlight.has(groupId)) {
        return false;
      }
      return !get().groupDirectory[groupId];
    });

    if (missingIds.length === 0) {
      return;
    }

    for (const groupId of missingIds) {
      groupHydrationInFlight.add(groupId);
    }

    try {
      const groupResults = await Promise.allSettled(
        missingIds.map((groupId) => groupApi.getById(groupId)),
      );
      const groupEntries: GroupDirectoryEntry[] = [];
      for (const result of groupResults) {
        if (result.status !== "fulfilled") {
          continue;
        }
        groupEntries.push(toGroupDirectoryEntry(result.value));
      }

      if (groupEntries.length === 0) {
        return;
      }

      set((state) => {
        const nextGroupDirectory = { ...state.groupDirectory };
        for (const groupEntry of groupEntries) {
          nextGroupDirectory[groupEntry.id] = groupEntry;
        }

        return {
          groupDirectory: nextGroupDirectory,
          conversations: sortConversations(
            state.conversations.map((conversation) =>
              refreshConversationPresentation(
                conversation,
                state.activeUserId,
                state.userDirectory,
                nextGroupDirectory,
              ),
            ),
          ),
        };
      });
    } finally {
      for (const groupId of missingIds) {
        groupHydrationInFlight.delete(groupId);
      }
    }
  };

  return {
    activeUserId: null,
    loadingConversations: false,
    loadingMessagesByConversationId: {},
    loadedMessagesByConversationId: {},
    conversations: [],
    messagesByConversationId: {},
    presenceByUserId: {},
    selectedConversationId: null,
    userDirectory: {},
    groupDirectory: {},
    error: null,

    bootstrap: async (authUser) => {
      if (!isNonBlankString(authUser.sub)) {
        return;
      }

      const state = get();
      if (
        state.activeUserId === authUser.sub &&
        state.conversations.length > 0 &&
        !state.loadingConversations
      ) {
        if (state.selectedConversationId) {
          await get().loadMessages(state.selectedConversationId, authUser.sub);
        }
        return;
      }

      if (conversationsLoadPromise) {
        return conversationsLoadPromise;
      }

      set({
        loadingConversations: true,
        error: null,
      });

      conversationsLoadPromise = (async () => {
        const [conversations, groups] = await Promise.all([
          chatApi.getConversations(),
          groupApi.getMine().catch(() => [] as GroupSummary[]),
        ]);

        const groupDirectory: Record<string, GroupDirectoryEntry> = {};
        for (const group of groups) {
          groupDirectory[group.id] = toGroupDirectoryEntry(group);
        }

        const groupParticipantIdsByGroupId: Record<string, string[]> = {};
        const groupMembersResults = await Promise.allSettled(
          groups.map((group) => groupApi.getMembers(group.id)),
        );
        for (const [index, result] of groupMembersResults.entries()) {
          if (result.status !== "fulfilled") {
            continue;
          }
          const groupId = groups[index]?.id;
          if (!groupId) {
            continue;
          }
          groupParticipantIdsByGroupId[groupId] = uniqueNonBlank(
            result.value.map((member) => member.userId),
          );
        }

        const participantIds = uniqueNonBlank(
          conversations.flatMap((conversation) => conversation.participants ?? []),
        )
          .concat(
            uniqueNonBlank(
              Object.values(groupParticipantIdsByGroupId).flatMap(
                (participantIdsByGroup) => participantIdsByGroup,
              ),
            ),
          )
          .filter((participantId) => participantId !== authUser.sub);

        await hydrateUsers(participantIds);
        const currentDirectory = get().userDirectory;
        const userDirectory: Record<string, UserDirectoryEntry> = {
          ...currentDirectory,
          [authUser.sub]: toAuthUserDirectoryEntry(authUser),
        };

        const conversationsById = new Map<string, MessageConversationItem>();
        for (const conversation of conversations) {
          const mappedConversation = mapConversationToItem(
            conversation,
            authUser.sub,
            userDirectory,
            groupDirectory,
          );
          conversationsById.set(mappedConversation.id, mappedConversation);
        }

        for (const group of groups) {
          const conversationId = `group:${group.id}`;
          const existingConversation = conversationsById.get(conversationId) ?? null;
          const participantIdsForGroup = uniqueNonBlank([
            ...(groupParticipantIdsByGroupId[group.id] ?? []),
            ...(existingConversation?.participantIds ?? []),
            authUser.sub,
          ]);

          const mergedConversation = refreshConversationPresentation(
            {
              id: conversationId,
              kind: "group",
              title: group.name || existingConversation?.title || `Groupe ${group.id.slice(0, 8)}`,
              subtitle:
                group.memberCount > 0
                  ? `${group.memberCount} membre${group.memberCount > 1 ? "s" : ""}`
                  : existingConversation?.subtitle || "Conversation de groupe",
              avatarSeeds: existingConversation?.avatarSeeds ?? [],
              participantIds:
                participantIdsForGroup.length > 0 ? participantIdsForGroup : [authUser.sub],
              peerUserId: null,
              groupId: group.id,
              unreadCount: existingConversation?.unreadCount ?? 0,
              lastMessagePreview:
                existingConversation?.lastMessagePreview ?? "Aucun message pour le moment",
              lastMessageAt:
                existingConversation?.lastMessageAt ??
                normalizeIsoDate(group.updatedAt) ??
                normalizeIsoDate(group.createdAt),
            },
            authUser.sub,
            userDirectory,
            groupDirectory,
          );

          conversationsById.set(conversationId, mergedConversation);
        }

        const mergedConversations = sortConversations(Array.from(conversationsById.values()));
        const preferredSelection =
          mergedConversations.find((conversation) => conversation.id === get().selectedConversationId)
            ?.id ??
          mergedConversations[0]?.id ??
          null;

        set({
          activeUserId: authUser.sub,
          loadingConversations: false,
          conversations: mergedConversations,
          selectedConversationId: preferredSelection,
          userDirectory,
          groupDirectory,
          messagesByConversationId: {},
          presenceByUserId: {},
          loadingMessagesByConversationId: {},
          loadedMessagesByConversationId: {},
          error: null,
        });

        if (preferredSelection) {
          await get().loadMessages(preferredSelection, authUser.sub);
        }
      })()
        .catch(() => {
          set({
            loadingConversations: false,
            conversations: [],
            selectedConversationId: null,
            messagesByConversationId: {},
            presenceByUserId: {},
            loadingMessagesByConversationId: {},
            loadedMessagesByConversationId: {},
            error: "Impossible de charger les conversations.",
          });
        })
        .finally(() => {
          conversationsLoadPromise = null;
        });

      return conversationsLoadPromise;
    },

    reset: () => {
      conversationsLoadPromise = null;
      messagesLoadPromises.clear();
      userHydrationInFlight.clear();
      groupHydrationInFlight.clear();

      set({
        activeUserId: null,
        loadingConversations: false,
        loadingMessagesByConversationId: {},
        loadedMessagesByConversationId: {},
        conversations: [],
        messagesByConversationId: {},
        presenceByUserId: {},
        selectedConversationId: null,
        userDirectory: {},
        groupDirectory: {},
        error: null,
      });
    },

    ensurePeerConversation: async (authUser, peerUserId) => {
      if (!isNonBlankString(authUser?.sub) || !isNonBlankString(peerUserId)) {
        return null;
      }

      const normalizedPeerUserId = peerUserId.trim();
      const conversationId = buildPeerConversationId(authUser.sub, normalizedPeerUserId);

      const existingConversation = get().conversations.find(
        (conversation) => conversation.id === conversationId,
      );
      if (existingConversation) {
        return conversationId;
      }

      if (normalizedPeerUserId !== authUser.sub) {
        await hydrateUsers([normalizedPeerUserId]);
      }

      set((state) => {
        const alreadyExists = state.conversations.some(
          (conversation) => conversation.id === conversationId,
        );
        if (alreadyExists) {
          return state;
        }

        const nextUserDirectory = {
          ...state.userDirectory,
          [authUser.sub]:
            state.userDirectory[authUser.sub] ?? toAuthUserDirectoryEntry(authUser),
        };

        const peerDirectoryEntry = nextUserDirectory[normalizedPeerUserId];
        const fallbackLabel = `Utilisateur ${normalizedPeerUserId.slice(0, 8)}`;

        const createdConversation: MessageConversationItem = refreshConversationPresentation(
          {
            id: conversationId,
            kind: "peer",
            title: peerDirectoryEntry?.displayName ?? fallbackLabel,
            subtitle: peerDirectoryEntry?.handle ?? `@${normalizedPeerUserId.slice(0, 8)}`,
            avatarSeeds: [peerDirectoryEntry?.displayName ?? fallbackLabel],
            participantIds: uniqueNonBlank([authUser.sub, normalizedPeerUserId]),
            peerUserId: normalizedPeerUserId,
            groupId: null,
            unreadCount: 0,
            lastMessagePreview: "Commencez la conversation",
            lastMessageAt: null,
          },
          state.activeUserId ?? authUser.sub,
          nextUserDirectory,
          state.groupDirectory,
        );

        return {
          activeUserId: state.activeUserId ?? authUser.sub,
          userDirectory: nextUserDirectory,
          selectedConversationId: conversationId,
          conversations: sortConversations([createdConversation, ...state.conversations]),
          messagesByConversationId: {
            ...state.messagesByConversationId,
            [conversationId]: state.messagesByConversationId[conversationId] ?? [],
          },
          loadingMessagesByConversationId: {
            ...state.loadingMessagesByConversationId,
            [conversationId]: false,
          },
          loadedMessagesByConversationId: {
            ...state.loadedMessagesByConversationId,
            [conversationId]: true,
          },
          error: null,
        };
      });

      return conversationId;
    },

    upsertGroupConversation: (group, authUserId, participantIds = [], options = {}) => {
      if (!isNonBlankString(group?.id) || !isNonBlankString(authUserId)) {
        return null;
      }

      const conversationId = `group:${group.id}`;
      const normalizedParticipantIds = uniqueNonBlank([authUserId, ...participantIds]);
      const shouldSelectConversation = options.select ?? true;

      set((state) => {
        const nextGroupDirectory: Record<string, GroupDirectoryEntry> = {
          ...state.groupDirectory,
          [group.id]: toGroupDirectoryEntry(group),
        };

        const existingConversation = state.conversations.find(
          (conversation) => conversation.id === conversationId,
        );

        const baseConversation: MessageConversationItem =
          existingConversation ??
          {
            id: conversationId,
            kind: "group",
            title: group.name || `Groupe ${group.id.slice(0, 8)}`,
            subtitle: `${group.memberCount} membre${group.memberCount > 1 ? "s" : ""}`,
            avatarSeeds: [],
            participantIds:
              normalizedParticipantIds.length > 0 ? normalizedParticipantIds : [authUserId],
            peerUserId: null,
            groupId: group.id,
            unreadCount: 0,
            lastMessagePreview: "Nouveau groupe",
            lastMessageAt: null,
          };

        const mergedParticipantIds = uniqueNonBlank([
          ...(normalizedParticipantIds.length > 0 ? normalizedParticipantIds : []),
          ...baseConversation.participantIds,
          authUserId,
        ]);

        const updatedConversation = refreshConversationPresentation(
          {
            ...baseConversation,
            title: group.name || baseConversation.title,
            groupId: group.id,
            participantIds: mergedParticipantIds,
            subtitle:
              group.memberCount > 0
                ? `${group.memberCount} membre${group.memberCount > 1 ? "s" : ""}`
                : baseConversation.subtitle,
          },
          state.activeUserId ?? authUserId,
          state.userDirectory,
          nextGroupDirectory,
        );

        return {
          activeUserId: state.activeUserId ?? authUserId,
          groupDirectory: nextGroupDirectory,
          selectedConversationId: shouldSelectConversation
            ? conversationId
            : state.selectedConversationId,
          conversations: sortConversations([
            updatedConversation,
            ...state.conversations.filter((conversation) => conversation.id !== conversationId),
          ]),
          messagesByConversationId: {
            ...state.messagesByConversationId,
            [conversationId]: state.messagesByConversationId[conversationId] ?? [],
          },
          loadingMessagesByConversationId: {
            ...state.loadingMessagesByConversationId,
            [conversationId]: false,
          },
          loadedMessagesByConversationId: {
            ...state.loadedMessagesByConversationId,
            [conversationId]: true,
          },
          error: null,
        };
      });

      return conversationId;
    },

    removeGroupConversation: (groupId) => {
      if (!isNonBlankString(groupId)) {
        return;
      }

      const conversationId = `group:${groupId}`;
      set((state) => {
        const nextGroupDirectory = { ...state.groupDirectory };
        delete nextGroupDirectory[groupId];

        const nextConversations = state.conversations.filter(
          (conversation) => conversation.id !== conversationId,
        );

        const nextMessagesByConversationId = { ...state.messagesByConversationId };
        delete nextMessagesByConversationId[conversationId];

        const nextLoadingMessagesByConversationId = { ...state.loadingMessagesByConversationId };
        delete nextLoadingMessagesByConversationId[conversationId];

        const nextLoadedMessagesByConversationId = { ...state.loadedMessagesByConversationId };
        delete nextLoadedMessagesByConversationId[conversationId];

        return {
          groupDirectory: nextGroupDirectory,
          conversations: nextConversations,
          messagesByConversationId: nextMessagesByConversationId,
          loadingMessagesByConversationId: nextLoadingMessagesByConversationId,
          loadedMessagesByConversationId: nextLoadedMessagesByConversationId,
          selectedConversationId:
            state.selectedConversationId === conversationId ? null : state.selectedConversationId,
        };
      });
    },

    removeGroupConversationParticipant: (groupId, userId) => {
      if (!isNonBlankString(groupId) || !isNonBlankString(userId)) {
        return;
      }

      const conversationId = `group:${groupId}`;
      set((state) => {
        const conversation = state.conversations.find((item) => item.id === conversationId);
        if (!conversation) {
          return state;
        }

        const nextParticipantIds = conversation.participantIds.filter(
          (participantId) => participantId !== userId,
        );
        const previousGroupDirectoryEntry = state.groupDirectory[groupId];
        const nextGroupDirectory = { ...state.groupDirectory };

        if (previousGroupDirectoryEntry) {
          nextGroupDirectory[groupId] = {
            ...previousGroupDirectoryEntry,
            memberCount: Math.max(0, previousGroupDirectoryEntry.memberCount - 1),
          };
        }

        const nextConversations = sortConversations(
          state.conversations.map((item) => {
            if (item.id !== conversationId) {
              return item;
            }

            return refreshConversationPresentation(
              {
                ...item,
                participantIds: nextParticipantIds,
              },
              state.activeUserId,
              state.userDirectory,
              nextGroupDirectory,
            );
          }),
        );
        return {
          groupDirectory: nextGroupDirectory,
          conversations: nextConversations,
        };
      });
    },

    selectConversation: async (conversationId, authUserId) => {
      set((state) => ({
        selectedConversationId: conversationId,
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                unreadCount: 0,
              }
            : conversation,
        ),
      }));

      await get().loadMessages(conversationId, authUserId);
      void chatApi.markConversationRead(conversationId).catch(() => undefined);
    },

    loadMessages: async (conversationId, authUserId, force = false) => {
      if (!isNonBlankString(conversationId) || !isNonBlankString(authUserId)) {
        return;
      }

      if (!force && get().loadedMessagesByConversationId[conversationId]) {
        return;
      }

      const existingPromise = messagesLoadPromises.get(conversationId);
      if (existingPromise) {
        return existingPromise;
      }

      set((state) => ({
        loadingMessagesByConversationId: {
          ...state.loadingMessagesByConversationId,
          [conversationId]: true,
        },
      }));

      const loadPromise = (async () => {
        const page = await chatApi.getConversationMessages(
          conversationId,
          0,
          DEFAULT_MESSAGE_PAGE_SIZE,
        );
        const messages = page.content ?? [];

        const senderIds = uniqueNonBlank(messages.map((message) => message.senderId));
        await hydrateUsers(senderIds);
        const userDirectory = get().userDirectory;

        const mappedMessages = sortMessages(
          messages
            .map((message) => mapMessageToItem(message, authUserId, userDirectory))
            .reverse(),
        );

        set((state) => ({
          messagesByConversationId: {
            ...state.messagesByConversationId,
            [conversationId]: mappedMessages,
          },
          loadedMessagesByConversationId: {
            ...state.loadedMessagesByConversationId,
            [conversationId]: true,
          },
          loadingMessagesByConversationId: {
            ...state.loadingMessagesByConversationId,
            [conversationId]: false,
          },
          error: null,
        }));
      })()
        .catch(() => {
          set((state) => ({
            loadingMessagesByConversationId: {
              ...state.loadingMessagesByConversationId,
              [conversationId]: false,
            },
            error: "Impossible de charger les messages.",
          }));
        })
        .finally(() => {
          messagesLoadPromises.delete(conversationId);
        });

      messagesLoadPromises.set(conversationId, loadPromise);
      return loadPromise;
    },

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
});
