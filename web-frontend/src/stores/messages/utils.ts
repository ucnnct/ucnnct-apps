import type { WsMessagePayload } from "../../realtime/wsProtocol";
import { GROUP_CONVERSATION_PREFIX } from "./constants";
import type {
  MessageConversationItem,
  MessageItem,
  WsConversationRef,
} from "./types";

export function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function uniqueNonBlank(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (!isNonBlankString(value)) {
      continue;
    }
    seen.add(value.trim());
  }
  return Array.from(seen);
}

export function toEpoch(isoDate: string | null): number {
  if (!isoDate) {
    return 0;
  }
  const parsed = Date.parse(isoDate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!isNonBlankString(value)) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

export function normalizeIsoDateOrNow(value: string | null | undefined): string {
  return normalizeIsoDate(value) ?? new Date().toISOString();
}

export function sortConversations(items: MessageConversationItem[]): MessageConversationItem[] {
  return [...items].sort((left, right) => {
    const byDate = toEpoch(right.lastMessageAt) - toEpoch(left.lastMessageAt);
    if (byDate !== 0) {
      return byDate;
    }
    return left.id.localeCompare(right.id);
  });
}

export function sortMessages(items: MessageItem[]): MessageItem[] {
  return [...items].sort((left, right) => {
    const byDate = toEpoch(left.createdAt) - toEpoch(right.createdAt);
    if (byDate !== 0) {
      return byDate;
    }
    return left.id.localeCompare(right.id);
  });
}

export function buildPeerConversationId(userA: string, userB: string): string {
  const first = userA < userB ? userA : userB;
  const second = userA < userB ? userB : userA;
  return `peer:${first}_${second}`;
}

export function extractGroupId(conversationId: string): string | null {
  if (!conversationId.startsWith(GROUP_CONVERSATION_PREFIX)) {
    return null;
  }
  const groupId = conversationId.slice(GROUP_CONVERSATION_PREFIX.length).trim();
  return groupId.length > 0 ? groupId : null;
}

export function resolvePrivatePeerUserId(
  payload: WsMessagePayload,
  authUserId: string,
): string | null {
  if (isNonBlankString(payload.senderId) && payload.senderId !== authUserId) {
    return payload.senderId;
  }
  const receivers = uniqueNonBlank(payload.receiversId ?? []);
  const nonSelfReceiver = receivers.find((receiverId) => receiverId !== authUserId);
  return nonSelfReceiver ?? receivers[0] ?? null;
}

export function resolveConversationRef(
  payload: WsMessagePayload,
  authUserId: string,
): WsConversationRef | null {
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

export function makeTransientMessageId(): string {
  return `ws-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
