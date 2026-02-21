import type { NotificationItem } from "../../api/notifications";

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

export function isNotificationRead(item: NotificationItem): boolean {
  if (item.readAt !== null && item.readAt !== undefined) {
    return true;
  }
  return String(item.status ?? "").toUpperCase() === "READ";
}
