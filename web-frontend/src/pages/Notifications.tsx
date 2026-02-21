import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "../api/notifications";
import { useAuth } from "../auth/AuthProvider";
import {
  NotificationsHeader,
  NotificationsInbox,
} from "../components/notifications";
import { isNotificationRead } from "../components/notifications/utils";
import Layout from "../components/layout/Layout";
import { buildNotificationDestination } from "../notifications/navigation";
import { useNotificationsStore } from "../stores/notificationsStore";

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = useNotificationsStore((state) => state.items);
  const loading = useNotificationsStore((state) => state.loading);
  const loadingMore = useNotificationsStore((state) => state.loadingMore);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const hasMore = useNotificationsStore((state) => state.hasMore);
  const error = useNotificationsStore((state) => state.error);
  const bootstrap = useNotificationsStore((state) => state.bootstrap);
  const loadMore = useNotificationsStore((state) => state.loadMore);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);
  const reset = useNotificationsStore((state) => state.reset);

  useEffect(() => {
    if (!user?.sub) {
      reset();
      return;
    }
    void bootstrap(user.sub);
  }, [bootstrap, reset, user?.sub]);

  const handleNotificationOpen = async (item: NotificationItem) => {
    const read = isNotificationRead(item);
    const destination = buildNotificationDestination(item, user?.sub ?? null);

    if (user?.sub && !read) {
      await markAsRead(user.sub, item.notificationId);
    }

    navigate(destination);
  };

  const handleMarkAllAsRead = () => {
    if (!user?.sub) {
      return;
    }
    void markAllAsRead(user.sub);
  };

  const handleLoadMore = () => {
    if (!user?.sub) {
      return;
    }
    void loadMore(user.sub);
  };

  return (
    <Layout hideSidebarRight>
      <div className="h-full bg-white flex flex-col font-body">
        <NotificationsHeader
          unreadCount={unreadCount}
          canMarkAllAsRead={Boolean(user?.sub) && unreadCount > 0}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
        <NotificationsInbox
          items={items}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          canLoadMore={Boolean(user?.sub)}
          error={error}
          onOpenNotification={handleNotificationOpen}
          onLoadMore={handleLoadMore}
        />
      </div>
    </Layout>
  );
}
