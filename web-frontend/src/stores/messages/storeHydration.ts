import { groupApi } from "../../api/groups";
import { userApi } from "../../api/users";
import {
  refreshConversationPresentation,
  resolveUserDisplayName,
  toGroupDirectoryEntry,
  toUserDirectoryEntry,
} from "./mappers";
import type {
  GroupDirectoryEntry,
  MessageItem,
  UserDirectoryEntry,
} from "./types";
import type { MessagesGet, MessagesHydrators, MessagesSet } from "./storeContext";
import { sortConversations, uniqueNonBlank } from "./utils";
import { runtimeState } from "./storeRuntime";

export function createMessagesHydrators(
  set: MessagesSet,
  get: MessagesGet,
): MessagesHydrators {
  const hydrateUsers = async (userIds: string[]): Promise<void> => {
    const dedupedIds = uniqueNonBlank(userIds);
    if (dedupedIds.length === 0) {
      return;
    }

    const missingIds = dedupedIds.filter((userId) => {
      if (runtimeState.userHydrationInFlight.has(userId)) {
        return false;
      }
      return !get().userDirectory[userId];
    });

    if (missingIds.length === 0) {
      return;
    }

    for (const userId of missingIds) {
      runtimeState.userHydrationInFlight.add(userId);
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
        runtimeState.userHydrationInFlight.delete(userId);
      }
    }
  };

  const hydrateGroups = async (groupIds: string[]): Promise<void> => {
    const dedupedIds = uniqueNonBlank(groupIds);
    if (dedupedIds.length === 0) {
      return;
    }

    const missingIds = dedupedIds.filter((groupId) => {
      if (runtimeState.groupHydrationInFlight.has(groupId)) {
        return false;
      }
      return !get().groupDirectory[groupId];
    });

    if (missingIds.length === 0) {
      return;
    }

    for (const groupId of missingIds) {
      runtimeState.groupHydrationInFlight.add(groupId);
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
        runtimeState.groupHydrationInFlight.delete(groupId);
      }
    }
  };

  return {
    hydrateUsers,
    hydrateGroups,
  };
}
