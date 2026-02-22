import type { NotificationItem } from "../../api/notifications";

const CATEGORY_LABELS: Record<string, string> = {
  PRIVATE_MESSAGE_IN_APP: "Message prive",
  GROUP_MESSAGE_IN_APP: "Message de groupe",
  GROUP_MEMBER_ADDED_IN_APP: "Ajout a un groupe",
  GROUP_DELETED_IN_APP: "Suppression de groupe",
  FRIEND_REQUEST_IN_APP: "Demande d'ami",
  FRIEND_REQUEST_ACCEPTED_IN_APP: "Demande d'ami acceptee",
  FRIEND_REQUEST_REJECTED_IN_APP: "Demande d'ami refusee",
  FRIEND_REMOVED_IN_APP: "Amitie terminee",
};

const TECHNICAL_TOKEN_ALIASES: Record<string, string> = {
  GROUPE_MESSAGE_IN_APP: "GROUP_MESSAGE_IN_APP",
  MESSAGE_PRIVE_IN_APP: "PRIVATE_MESSAGE_IN_APP",
};

function normalizeEnumToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveCategoryKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = normalizeEnumToken(value);
  return TECHNICAL_TOKEN_ALIASES[normalized] ?? normalized;
}

export function formatNotificationDate(epochMillis: number | null): string {
  if (!epochMillis) {
    return "";
  }
  const date = new Date(epochMillis);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatNotificationCategory(category: string | null | undefined): string {
  const key = resolveCategoryKey(category);
  if (!key) {
    return "Notification";
  }
  return CATEGORY_LABELS[key] ?? "Notification";
}

export function formatNotificationContent(item: NotificationItem): string {
  const rawContent = item.content?.trim() ?? "";
  if (!rawContent) {
    return formatNotificationCategory(item.category);
  }

  const tokenKey = resolveCategoryKey(rawContent);
  if (tokenKey && CATEGORY_LABELS[tokenKey]) {
    return CATEGORY_LABELS[tokenKey];
  }

  if (/^[A-Z0-9_]+$/.test(rawContent)) {
    return formatNotificationCategory(item.category);
  }

  return rawContent;
}

export function isNotificationRead(item: NotificationItem): boolean {
  if (item.readAt !== null && item.readAt !== undefined) {
    return true;
  }
  return String(item.status ?? "").toUpperCase() === "READ";
}
