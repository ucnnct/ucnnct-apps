import { apiFetch } from "./client";

export type NotificationStatus = "UNREAD" | "READ" | string;

export interface NotificationItem {
  notificationId: string;
  ownerUserId: string;
  targetId: string | null;
  category: string | null;
  content: string;
  status: NotificationStatus;
  createdAt: number | null;
  readAt: number | null;
}

export interface NotificationPageResponse {
  notifications: NotificationItem[];
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface NotificationReadUpdateResponse {
  updatedCount: number;
}

const NOTIFICATIONS_API_BASE = "/api/notifications/users";

export const notificationsApi = {
  getMine: (userId: string, limit = 20, cursor?: string) => {
    const encodedUserId = encodeURIComponent(userId);
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      query.set("cursor", cursor);
    }
    return apiFetch<NotificationPageResponse>(
      `${NOTIFICATIONS_API_BASE}/${encodedUserId}?${query.toString()}`,
    );
  },

  markAsRead: (userId: string, notificationId: string) =>
    apiFetch<NotificationReadUpdateResponse>(
      `${NOTIFICATIONS_API_BASE}/${encodeURIComponent(userId)}/${encodeURIComponent(notificationId)}/read`,
      { method: "PATCH" },
    ),

  markAllAsRead: (userId: string) =>
    apiFetch<NotificationReadUpdateResponse>(
      `${NOTIFICATIONS_API_BASE}/${encodeURIComponent(userId)}/read-all`,
      { method: "PATCH" },
    ),
};
