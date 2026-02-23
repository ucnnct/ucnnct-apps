import { chatApi } from "../../api/chat";
import { groupApi, type GroupSummary } from "../../api/groups";
import { DEFAULT_MESSAGE_PAGE_SIZE } from "./constants";
import {
  mapConversationToItem,
  mapMessageToItem,
  refreshConversationPresentation,
  toAuthUserDirectoryEntry,
  toGroupDirectoryEntry,
} from "./mappers";
import type {
  GroupDirectoryEntry,
  MessageConversationItem,
  MessagesStoreState,
  UserDirectoryEntry,
} from "./types";
import type { MessagesGet, MessagesHydrators, MessagesSet } from "./storeContext";
import { runtimeState, resetMessagesRuntime } from "./storeRuntime";
import {
  buildPeerConversationId,
  isNonBlankString,
  normalizeIsoDate,
  sortConversations,
  sortMessages,
  uniqueNonBlank,
} from "./utils";

type ConversationActions = Pick<
  MessagesStoreState,
  | "bootstrap"
  | "reset"
  | "ensurePeerConversation"
  | "upsertGroupConversation"
  | "removeGroupConversation"
  | "removeGroupConversationParticipant"
  | "selectConversation"
  | "loadMessages"
>;

export function createMessagesConversationActions(
  set: MessagesSet,
  get: MessagesGet,
  hydrators: MessagesHydrators,
): ConversationActions {
  const { hydrateUsers } = hydrators;

  return {
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

      if (runtimeState.conversationsLoadPromise) {
        return runtimeState.conversationsLoadPromise;
      }

      set({
        loadingConversations: true,
        error: null,
      });

      runtimeState.conversationsLoadPromise = (async () => {
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
          typingByConversationId: {},
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
            typingByConversationId: {},
            loadingMessagesByConversationId: {},
            loadedMessagesByConversationId: {},
            error: "Impossible de charger les conversations.",
          });
        })
        .finally(() => {
          runtimeState.conversationsLoadPromise = null;
        });

      return runtimeState.conversationsLoadPromise;
    },

    reset: () => {
      resetMessagesRuntime();

      set({
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

      const existingPromise = runtimeState.messagesLoadPromises.get(conversationId);
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
          runtimeState.messagesLoadPromises.delete(conversationId);
        });

      runtimeState.messagesLoadPromises.set(conversationId, loadPromise);
      return loadPromise;
    },
  };
}
