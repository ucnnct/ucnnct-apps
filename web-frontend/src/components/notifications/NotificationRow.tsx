import type { NotificationItem } from "../../api/notifications";
import { formatNotificationDate, isNotificationRead } from "./utils";

interface NotificationRowProps {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
}

export default function NotificationRow({ item, onOpen }: NotificationRowProps) {
  const read = isNotificationRead(item);

  return (
    <button
      onClick={() => onOpen(item)}
      className={`w-full text-left p-4 border rounded-sm transition-colors ${
        read
          ? "border-secondary-100 bg-white"
          : "border-primary-200 bg-primary-50/30 hover:bg-primary-50/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-primary-900 break-words">{item.content}</p>
          <p className="text-[11px] text-secondary-400 mt-1">
            {item.category ?? "notification"} - {formatNotificationDate(item.createdAt)}
          </p>
        </div>
        {!read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1" />}
      </div>
    </button>
  );
}
