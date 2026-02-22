import type {
  NotificationItem,
  NotificationPageResponse,
} from "../../api/notifications";

export function isNonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toMillis(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isRead(notification: NotificationItem): boolean {
  if (notification.readAt !== null && notification.readAt !== undefined) {
    return true;
  }
  return String(notification.status ?? "").toUpperCase() === "READ";
}

function normalizeForKey(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.trim().toLowerCase();
}

function toSemanticKey(item: NotificationItem): string {
  const timeBucket = Math.floor((item.createdAt ?? 0) / 2000);
  return [
    normalizeForKey(item.ownerUserId),
    normalizeForKey(item.targetId),
    normalizeForKey(item.category),
    normalizeForKey(item.content),
    String(timeBucket),
  ].join("|");
}

function mergeNotificationEntries(
  current: NotificationItem,
  incoming: NotificationItem,
): NotificationItem {
  const next = {
    ...current,
    ...incoming,
  };

  const readAt = [current.readAt, incoming.readAt].reduce<number | null>(
    (maxValue, value) => {
      if (value === null || value === undefined) {
        return maxValue;
      }
      if (maxValue === null) {
        return value;
      }
      return value > maxValue ? value : maxValue;
    },
    null,
  );

  if (isRead(current) || isRead(incoming)) {
    return {
      ...next,
      status: "READ",
      readAt,
    };
  }

  return {
    ...next,
    readAt: null,
  };
}

function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((left, right) => {
    const leftTime = left.createdAt ?? 0;
    const rightTime = right.createdAt ?? 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return right.notificationId.localeCompare(left.notificationId);
  });
}

export function countUnread(items: NotificationItem[]): number {
  return items.reduce((count, item) => count + (isRead(item) ? 0 : 1), 0);
}

export function normalizeNotification(
  item: Partial<NotificationItem>,
): NotificationItem | null {
  if (!isNonBlank(item.notificationId)) {
    return null;
  }
  return {
    notificationId: item.notificationId,
    ownerUserId: isNonBlank(item.ownerUserId) ? item.ownerUserId : "",
    targetId: isNonBlank(item.targetId) ? item.targetId : null,
    category: isNonBlank(item.category) ? item.category : null,
    content: isNonBlank(item.content) ? item.content : "Nouvelle notification",
    status: isNonBlank(item.status) ? item.status : "UNREAD",
    createdAt: toMillis(item.createdAt),
    readAt: toMillis(item.readAt),
  };
}

export function mergeNotifications(
  existing: NotificationItem[],
  incoming: NotificationItem[],
): NotificationItem[] {
  const byId = new Map(existing.map((item) => [item.notificationId, item]));
  for (const item of incoming) {
    const current = byId.get(item.notificationId);
    byId.set(
      item.notificationId,
      current ? mergeNotificationEntries(current, item) : item,
    );
  }

  const bySemanticKey = new Map<string, NotificationItem>();
  for (const item of byId.values()) {
    const semanticKey = toSemanticKey(item);
    const current = bySemanticKey.get(semanticKey);
    bySemanticKey.set(
      semanticKey,
      current ? mergeNotificationEntries(current, item) : item,
    );
  }

  return sortNotifications(Array.from(bySemanticKey.values()));
}

export function normalizePageResponse(
  response: NotificationPageResponse,
): NotificationItem[] {
  const normalized = (response.notifications ?? [])
    .map((item) => normalizeNotification(item))
    .filter((item): item is NotificationItem => item !== null);
  return mergeNotifications([], normalized);
}
