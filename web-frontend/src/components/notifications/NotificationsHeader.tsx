import { CheckCheck } from "lucide-react";

interface NotificationsHeaderProps {
  unreadCount: number;
  canMarkAllAsRead: boolean;
  onMarkAllAsRead: () => void;
}

export default function NotificationsHeader({
  unreadCount,
  canMarkAllAsRead,
  onMarkAllAsRead,
}: NotificationsHeaderProps) {
  return (
    <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-primary-900 font-display">Notifications</h1>
        <p className="text-xs text-secondary-400 mt-1">
          {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
        </p>
      </div>
      <button
        disabled={!canMarkAllAsRead}
        onClick={onMarkAllAsRead}
        className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-sm border border-secondary-200 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCheck size={14} />
        Tout marquer comme lu
      </button>
    </div>
  );
}
