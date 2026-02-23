import { Link } from "react-router-dom";
import type { NotificationItem } from "../../../api/notifications";
import { buildNotificationDestination } from "../../../notifications/navigation";
import {
  formatNotificationCategory,
  formatNotificationContent,
  formatNotificationDate,
} from "../../notifications/utils";

interface NotificationsPopoverProps {
  open: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  notificationsLoading: boolean;
  userId: string | null;
  onClose: () => void;
  onMarkAllRead: () => Promise<void>;
  onNotificationClick: (
    notificationId: string,
    isRead: boolean,
    destination: string,
  ) => Promise<void>;
}

export default function NotificationsPopover({
  open,
  notifications,
  unreadCount,
  notificationsLoading,
  userId,
  onClose,
  onMarkAllRead,
  onNotificationClick,
}: NotificationsPopoverProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed left-3 right-3 top-[72px] md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-[360px] bg-white border border-secondary-100 rounded-sm shadow-lg z-50 overflow-hidden max-h-[calc(100dvh-88px)] md:max-h-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100">
        <p className="text-sm font-semibold text-primary-900">Notifications</p>
        <button
          disabled={!userId || unreadCount === 0}
          onClick={() => void onMarkAllRead()}
          className="text-[11px] text-primary-500 hover:text-primary-700 disabled:text-secondary-300 disabled:cursor-not-allowed"
        >
          Tout lire
        </button>
      </div>

      <div className="max-h-[calc(100dvh-190px)] md:max-h-80 overflow-y-auto no-scrollbar">
        {notificationsLoading && notifications.length === 0 && (
          <p className="p-4 text-xs text-secondary-400">Chargement...</p>
        )}
        {!notificationsLoading && notifications.length === 0 && (
          <p className="p-4 text-xs text-secondary-400">Aucune notification</p>
        )}

        {notifications.slice(0, 8).map((item) => {
          const isRead = Boolean(item.readAt) || String(item.status).toUpperCase() === "READ";
          const destination = buildNotificationDestination(item, userId);
          const content = formatNotificationContent(item);
          const categoryLabel = formatNotificationCategory(item.category);
          return (
            <button
              key={item.notificationId}
              onClick={() =>
                void onNotificationClick(item.notificationId, isRead, destination)
              }
              className={`w-full text-left px-4 py-3 border-b border-secondary-50 last:border-b-0 hover:bg-secondary-50 transition-colors ${
                isRead ? "bg-white" : "bg-primary-50/30"
              }`}
            >
              <p className="text-xs text-primary-900 break-words">{content}</p>
              <p className="text-[11px] text-secondary-400 mt-1">
                {categoryLabel} - {formatNotificationDate(item.createdAt)}
              </p>
            </button>
          );
        })}
      </div>

      <Link
        to="/notifications"
        onClick={onClose}
        className="block text-center text-xs font-medium text-primary-500 hover:bg-secondary-50 px-4 py-3 border-t border-secondary-100"
      >
        Voir toutes les notifications
      </Link>
    </div>
  );
}
