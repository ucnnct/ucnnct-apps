import { create } from "zustand";
import { chatApi, type ChatConversation, type ChatMessage } from "../api/chat";
import { groupApi, type GroupSummary } from "../api/groups";
import { userApi, type UserProfile } from "../api/users";
import type { WsMessagePayload } from "../realtime/wsProtocol";
import type { AuthUser } from "./authStore";

const GROUP_CONVERSATION_PREFIX = "group:";
const DEFAULT_MESSAGE_PAGE_SIZE = 50;

type ConversationKind = "peer" | "group";

interface UserDirectoryEntry {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
}

interface GroupDirectoryEntry {
  id: string;
  name: string;
  memberCount: number;
}

export interface MessageConversationItem {
  id: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  avatarSeeds: string[];
  participantIds: string[];
  peerUserId: string | null;
  groupId: string | null;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: string | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderLabel: string;
  content: string;
  objectKey?: string;
  isOwn: boolean;
  createdAt: string;
}

interface MessagesStoreState {
  activeUserId: string | null;
  loadingConversations: boolean;
  loadingMessagesByConversationId: Record<string, boolean>;
  loadedMessagesByConversationId: Record<string, boolean>;
  conversations: MessageConversationItem[];
  messagesByConversationId: Record<string, MessageItem[]>;
  selectedConversationId: string | null;
  userDirectory: Record<string, UserDirectoryEntry>;
  groupDirectory: Record<string, GroupDirectoryEntry>;
  error: string | null;
  bootstrap: (authUser: AuthUser) => Promise<void>;
  reset: () => void;
  selectConversation: (conversationId: string, authUserId: string) => Promise<void>;
  loadMessages: (conversationId: string, authUserId: string, force?: boolean) => Promise<void>;
  ingestWsMessage: (payload: WsMessagePayload, authUser: AuthUser) => void;
}

type WsConversationRef = {
  conversationId: string;
  kind: ConversationKind;
  peerUserId: string | null;
  groupId: string | null;
};

let conversationsLoadPromise: Promise<void> | null = null;
const messagesLoadPromises = new Map<string, Promise<void>>();
const userHydrationInFlight = new Set<string>();
const groupHydrationInFlight = new Set<string>();

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueNonBlank(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (!isNonBlankString(value)) {
      continue;
    }
    seen.add(value.trim());
  }
  return Array.from(seen);
}

function toEpoch(isoDate: string | null): number {
  if (!isoDate) {
    return 0;
  }
  const parsed = Date.parse(isoDate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!isNonBlankString(value)) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function normalizeIsoDateOrNow(value: string | null | undefined): string {
  return normalizeIsoDate(value) ?? new Date().toISOString();
}

function sortConversations(items: MessageConversationItem[]): MessageConversationItem[] {
  return [...items].sort((left, right) => {
    const byDate = toEpoch(right.lastMessageAt) - toEpoch(left.lastMessageAt);
    if (byDate !== 0) {
      return byDate;
    }
    return left.id.localeCompare(right.id);
  });
}

function sortMessages(items: MessageItem[]): MessageItem[] {
  return [...items].sort((left, right) => {
    const byDate = toEpoch(left.createdAt) - toEpoch(right.createdAt);
    if (byDate !== 0) {
      return byDate;
    }
    return left.id.localeCompare(right.id);
  });
}

function buildPeerConversationId(userA: string, userB: string): string {
  const first = userA < userB ? userA : userB;
  const second = userA < userB ? userB : userA;
  return `peer:${first}_${second}`;
}

function extractGroupId(conversationId: string): string | null {
  if (!conversationId.startsWith(GROUP_CONVERSATION_PREFIX)) {
    return null;
  }
  const groupId = conversationId.slice(GROUP_CONVERSATION_PREFIX.length).trim();
  return groupId.length > 0 ? groupId : null;
}

function resolvePrivatePeerUserId(payload: WsMessagePayload, authUserId: string): string | null {
  if (isNonBlankString(payload.senderId) && payload.senderId !== authUserId) {
    return payload.senderId;
  }
  const receivers = uniqueNonBlank(payload.receiversId ?? []);
  const nonSelfReceiver = receivers.find((receiverId) => receiverId !== authUserId);
  return nonSelfReceiver ?? receivers[0] ?? null;
}

function resolveConversationRef(payload: WsMessagePayload, authUserId: string): WsConversationRef | null {
  if (isNonBlankString(payload.groupId)) {
    return {
      conversationId: `${GROUP_CONVERSATION_PREFIX}${payload.groupId}`,
      kind: "group",
      peerUserId: null,
      groupId: payload.groupId,
    };
  }

  const peerUserId = resolvePrivatePeerUserId(payload, authUserId);
  if (!peerUserId) {
    return null;
  }

  return {
    conversationId: buildPeerConversationId(authUserId, peerUserId),
    kind: "peer",
    peerUserId,
    groupId: null,
  };
}

function toUserDirectoryEntry(profile: UserProfile): UserDirectoryEntry {
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  const username = profile.username ?? "";
  const handle = username.includes("@") ? `@${profile.email.split("@")[0]}` : `@${username}`;
  return {
    id: profile.keycloakId,
    displayName: fullName || profile.email || profile.keycloakId,
    handle,
    avatarUrl: profile.avatarUrl ?? null,
  };
}

function toAuthUserDirectoryEntry(authUser: AuthUser): UserDirectoryEntry {
  const handleValue = authUser.preferredUsername.includes("@")
    ? authUser.shortHandle
    : authUser.preferredUsername || authUser.shortHandle;
  return {
    id: authUser.sub,
    displayName: authUser.fullName || authUser.email || authUser.sub,
    handle: `@${handleValue}`,
    avatarUrl: authUser.avatarUrl ?? null,
  };
}

function toGroupDirectoryEntry(group: GroupSummary): GroupDirectoryEntry {
  return {
    id: group.id,
    name: group.name,
    memberCount: group.memberCount,
  };
}

function resolveUserDisplayName(
  userId: string,
  userDirectory: Record<string, UserDirectoryEntry>,
): string {
  if (!isNonBlankString(userId)) {
    return "Utilisateur";
  }
  return userDirectory[userId]?.displayName ?? userId;
}

function resolveMessageContent(
  content: string | null | undefined,
  objectKey: string | null | undefined,
  deleted = false,
): string {
  if (deleted) {
    return "Message supprime";
  }
  if (isNonBlankString(content)) {
    return content.trim();
  }
  if (isNonBlankString(objectKey)) {
    return "[Fichier]";
  }
  return "";
}

function buildAvatarSeeds(
  kind: ConversationKind,
  participantIds: string[],
  userDirectory: Record<string, UserDirectoryEntry>,
  fallbackSeed: string,
  authUserId: string | null,
): string[] {
  if (kind === "peer") {
    return [fallbackSeed];
  }

  const seeds = participantIds
    .filter((participantId) => participantId !== authUserId)
    .map((participantId) => userDirectory[participantId]?.displayName ?? participantId)
    .slice(0, 4);

  if (seeds.length > 0) {
    return seeds;
  }

  return [fallbackSeed];
}

function mapConversationToItem(
  conversation: ChatConversation,
  authUserId: string,
  userDirectory: Record<string, UserDirectoryEntry>,
  groupDirectory: Record<string, GroupDirectoryEntry>,
): MessageConversationItem {
  const kind: ConversationKind =
    conversation.type === "GROUP" || conversation.id.startsWith(GROUP_CONVERSATION_PREFIX)
      ? "group"
      : "peer";
  const participantIds = uniqueNonBlank(conversation.participants ?? []);
  const lastMessagePreview =
    resolveMessageContent(conversation.lastMessage?.content, null, false) || "Nouveau message";
  const lastMessageAt =
    normalizeIsoDate(conversation.lastMessage?.createdAt) ??
    normalizeIsoDate(conversation.updatedAt) ??
    normalizeIsoDate(conversation.createdAt);
  const unreadCount = Math.max(0, conversation.unreadCounts?.[authUserId] ?? 0);

  if (kind === "group") {
    const groupId = extractGroupId(conversation.id);
    const group = groupId ? groupDirectory[groupId] : undefined;
    const title = group?.name ?? (groupId ? `Groupe ${groupId.slice(0, 8)}` : "Groupe");
    const memberCount = group?.memberCount ?? participantIds.length;
    const subtitle =
      memberCount > 0
        ? `${memberCount} membre${memberCount > 1 ? "s" : ""}`
        : "Conversation de groupe";
    return {
      id: conversation.id,
      kind,
      title,
      subtitle,
      avatarSeeds: buildAvatarSeeds(kind, participantIds, userDirectory, title, authUserId),
      participantIds,
      peerUserId: null,
      groupId,
      unreadCount,
      lastMessagePreview,
      lastMessageAt,
    };
  }

  const peerUserId = participantIds.find((participantId) => participantId !== authUserId) ?? null;
  const peerUser = peerUserId ? userDirectory[peerUserId] : undefined;
  const title =
    peerUser?.displayName ?? (peerUserId ? `Utilisateur ${peerUserId.slice(0, 8)}` : "Conversation");
  const subtitle = peerUser?.handle ?? (peerUserId ? `@${peerUserId.slice(0, 8)}` : "Conversation privee");

  return {
    id: conversation.id,
    kind,
    title,
    subtitle,
    avatarSeeds: buildAvatarSeeds(kind, participantIds, userDirectory, title, authUserId),
    participantIds,
    peerUserId,
    groupId: null,
    unreadCount,
    lastMessagePreview,
    lastMessageAt,
  };
}

function refreshConversationPresentation(
  conversation: MessageConversationItem,
  authUserId: string | null,
  userDirectory: Record<string, UserDirectoryEntry>,
  groupDirectory: Record<string, GroupDirectoryEntry>,
): MessageConversationItem {
  if (conversation.kind === "group") {
    const group = conversation.groupId ? groupDirectory[conversation.groupId] : undefined;
    const title = group?.name ?? conversation.title;
    const memberCount = group?.memberCount ?? conversation.participantIds.length;
    const subtitle =
      memberCount > 0
        ? `${memberCount} membre${memberCount > 1 ? "s" : ""}`
        : "Conversation de groupe";
    return {
      ...conversation,
      title,
      subtitle,
      avatarSeeds: buildAvatarSeeds(
        conversation.kind,
        conversation.participantIds,
        userDirectory,
        title,
        authUserId,
      ),
    };
  }

  const peerUser = conversation.peerUserId ? userDirectory[conversation.peerUserId] : undefined;
  const title = peerUser?.displayName ?? conversation.title;
  const subtitle = peerUser?.handle ?? conversation.subtitle;
  return {
    ...conversation,
    title,
    subtitle,
    avatarSeeds: buildAvatarSeeds(
      conversation.kind,
      conversation.participantIds,
      userDirectory,
      title,
      authUserId,
    ),
  };
}

function mapMessageToItem(
  message: ChatMessage,
  authUserId: string,
  userDirectory: Record<string, UserDirectoryEntry>,
): MessageItem {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderLabel: resolveUserDisplayName(message.senderId, userDirectory),
    content:
      resolveMessageContent(message.content, message.objectKey, Boolean(message.deleted)) ||
      "Nouveau message",
    objectKey: isNonBlankString(message.objectKey) ? message.objectKey : undefined,
    isOwn: message.senderId === authUserId,
    createdAt: normalizeIsoDateOrNow(message.createdAt),
  };
}

function upsertMessage(messages: MessageItem[], nextMessage: MessageItem): MessageItem[] {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);
  if (existingIndex === -1) {
    return sortMessages([...messages, nextMessage]);
  }

  const updatedMessages = [...messages];
  updatedMessages[existingIndex] = {
    ...updatedMessages[existingIndex],
    ...nextMessage,
  };
  return sortMessages(updatedMessages);
}

function makeTransientMessageId(): string {
  return `ws-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

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

        const participantIds = uniqueNonBlank(
          conversations.flatMap((conversation) => conversation.participants ?? []),
        ).filter((participantId) => participantId !== authUser.sub);

        await hydrateUsers(participantIds);
        const currentDirectory = get().userDirectory;
        const userDirectory: Record<string, UserDirectoryEntry> = {
          ...currentDirectory,
          [authUser.sub]: toAuthUserDirectoryEntry(authUser),
        };

        const mappedConversations = sortConversations(
          conversations.map((conversation) =>
            mapConversationToItem(conversation, authUser.sub, userDirectory, groupDirectory),
          ),
        );

        const preferredSelection =
          mappedConversations.find(
            (conversation) => conversation.id === get().selectedConversationId,
          )?.id ?? mappedConversations[0]?.id ?? null;

        set({
          activeUserId: authUser.sub,
          loadingConversations: false,
          conversations: mappedConversations,
          selectedConversationId: preferredSelection,
          userDirectory,
          groupDirectory,
          messagesByConversationId: {},
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
        selectedConversationId: null,
        userDirectory: {},
        groupDirectory: {},
        error: null,
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

      set((state) => {
        const nextMessage: MessageItem = {
          id: messageId,
          conversationId: conversationRef.conversationId,
          senderId,
          senderLabel: resolveUserDisplayName(senderId, state.userDirectory),
          content: messageContent,
          objectKey: isNonBlankString(payload.objectKey) ? payload.objectKey : undefined,
          isOwn: senderId === authUser.sub,
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
  };
});
