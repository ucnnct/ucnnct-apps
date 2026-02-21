import { Bell } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import type { NotificationItem } from "../../api/notifications";
import NotificationRow from "./NotificationRow";

interface NotificationsInboxProps {
  items: NotificationItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  canLoadMore: boolean;
  error: string | null;
  onOpenNotification: (item: NotificationItem) => void;
  onLoadMore: () => void;
}

export default function NotificationsInbox({
  items,
  loading,
  loadingMore,
  hasMore,
  canLoadMore,
  error,
  onOpenNotification,
  onLoadMore,
}: NotificationsInboxProps) {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
      <SectionHeader label="Inbox" />
      {loading && items.length === 0 && (
        <p className="text-sm text-secondary-400">Chargement des notifications...</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!loading && items.length === 0 && (
        <div className="py-20 border border-dashed border-secondary-100 rounded-sm text-center">
          <Bell className="mx-auto text-secondary-300 mb-3" size={18} />
          <p className="text-sm text-secondary-400">Aucune notification</p>
        </div>
      )}

      {items.map((item) => (
        <NotificationRow
          key={item.notificationId}
          item={item}
          onOpen={onOpenNotification}
        />
      ))}

      {hasMore && canLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full py-2 text-xs border border-secondary-200 rounded-sm hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingMore ? "Chargement..." : "Charger plus"}
        </button>
      )}
    </div>
  );
}
