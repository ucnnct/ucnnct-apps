import type { NotificationItem } from "../api/notifications";

const CATEGORY_PRIVATE = "PRIVATE_MESSAGE_IN_APP";
const CATEGORY_GROUP = "GROUP_MESSAGE_IN_APP";
const CATEGORY_GROUP_MEMBER_ADDED = "GROUP_MEMBER_ADDED_IN_APP";
const CATEGORY_GROUP_DELETED = "GROUP_DELETED_IN_APP";
const FRIEND_CATEGORIES = new Set([
  "FRIEND_REQUEST_IN_APP",
  "FRIEND_REQUEST_ACCEPTED_IN_APP",
  "FRIEND_REQUEST_REJECTED_IN_APP",
  "FRIEND_REMOVED_IN_APP",
]);

type ConversationTarget = {
  kind: "peer" | "group";
  targetId: string;
};

function normalizeCategory(value: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

function normalizeTargetId(value: string | null): string | null {
  if (!value || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

export function resolveNotificationConversationTarget(
  notification: NotificationItem,
  currentUserId?: string | null,
): ConversationTarget | null {
  const category = normalizeCategory(notification.category);
  const targetId = normalizeTargetId(notification.targetId);
  if (!targetId) {
    return null;
  }

  if (category === CATEGORY_GROUP || category === CATEGORY_GROUP_MEMBER_ADDED) {
    return { kind: "group", targetId };
  }

  if (category === CATEGORY_PRIVATE) {
    // Defensive fallback if backend sends owner id instead of peer id.
    if (currentUserId && targetId === currentUserId) {
      return null;
    }
    return { kind: "peer", targetId };
  }

  return null;
}

export function buildNotificationDestination(
  notification: NotificationItem,
  currentUserId?: string | null,
): string {
  if (isFriendNotificationCategory(notification.category)) {
    return "/friend-requests";
  }

  const category = normalizeCategory(notification.category ?? null);
  if (category === CATEGORY_GROUP_DELETED) {
    return "/messages";
  }

  const target = resolveNotificationConversationTarget(notification, currentUserId);
  if (!target) {
    return "/messages";
  }

  const params = new URLSearchParams({
    kind: target.kind,
    target: target.targetId,
  });
  return `/messages?${params.toString()}`;
}

export function isFriendNotificationCategory(category: string | null | undefined): boolean {
  return FRIEND_CATEGORIES.has(normalizeCategory(category ?? null));
}

export function isGroupMembershipNotificationCategory(
  category: string | null | undefined,
): boolean {
  const normalizedCategory = normalizeCategory(category ?? null);
  return (
    normalizedCategory === CATEGORY_GROUP_MEMBER_ADDED ||
    normalizedCategory === CATEGORY_GROUP_DELETED
  );
}
