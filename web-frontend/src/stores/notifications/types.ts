import type { NotificationItem } from "../../api/notifications";
import type { WsNotificationPayload } from "../../realtime/wsProtocol";

export interface NotificationsStoreState {
  activeUserId: string | null;
  loading: boolean;
  loadingMore: boolean;
  items: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  error: string | null;
  bootstrap: (userId: string, force?: boolean) => Promise<void>;
  loadMore: (userId: string) => Promise<void>;
  ingestInApp: (payload: WsNotificationPayload) => void;
  markAsRead: (userId: string, notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  reset: () => void;
}
