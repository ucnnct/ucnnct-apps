import type { ChatConversation, ChatMessage } from "../../api/chat";
import type { GroupSummary } from "../../api/groups";
import type { UserProfile } from "../../api/users";
import type { AuthUser } from "../authStore";
import { GROUP_CONVERSATION_PREFIX } from "./constants";
import type {
  ConversationKind,
  GroupDirectoryEntry,
  MessageDeliveryStatus,
  MessageConversationItem,
  MessageItem,
  UserDirectoryEntry,
} from "./types";
import {
  extractGroupId,
  isNonBlankString,
  normalizeIsoDate,
  normalizeIsoDateOrNow,
  sortMessages,
  uniqueNonBlank,
} from "./utils";

export function toUserDirectoryEntry(profile: UserProfile): UserDirectoryEntry {
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

export function toAuthUserDirectoryEntry(authUser: AuthUser): UserDirectoryEntry {
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

export function toGroupDirectoryEntry(group: GroupSummary): GroupDirectoryEntry {
  return {
    id: group.id,
    name: group.name,
    memberCount: group.memberCount,
    ownerId: group.ownerId ?? null,
  };
}

export function resolveUserDisplayName(
  userId: string,
  userDirectory: Record<string, UserDirectoryEntry>,
): string {
  if (!isNonBlankString(userId)) {
    return "Utilisateur";
  }
  return userDirectory[userId]?.displayName ?? userId;
}

export function resolveMessageContent(
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

export function normalizeMessageStatus(
  rawStatus: string | null | undefined,
): MessageDeliveryStatus {
  const normalized = rawStatus?.trim().toUpperCase() ?? "";
  if (normalized === "READ") {
    return "READ";
  }
  if (normalized === "DELIVERED" || normalized === "RECEIVED") {
    return "DELIVERED";
  }
  return "SENT";
}

export function maxMessageStatus(
  left: MessageDeliveryStatus,
  right: MessageDeliveryStatus,
): MessageDeliveryStatus {
  const rank: Record<MessageDeliveryStatus, number> = {
    SENT: 0,
    DELIVERED: 1,
    READ: 2,
  };

  return rank[left] >= rank[right] ? left : right;
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

export function mapConversationToItem(
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

export function refreshConversationPresentation(
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

export function mapMessageToItem(
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
    status: normalizeMessageStatus(message.status),
    createdAt: normalizeIsoDateOrNow(message.createdAt),
  };
}

export function upsertMessage(messages: MessageItem[], nextMessage: MessageItem): MessageItem[] {
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
