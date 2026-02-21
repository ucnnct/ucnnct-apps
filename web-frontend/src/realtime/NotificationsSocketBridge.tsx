import { groupApi } from "../api/groups";
import { useAuth } from "../auth/AuthProvider";
import {
  isFriendNotificationCategory,
  isGroupMembershipNotificationCategory,
} from "../notifications/navigation";
import { useMessagesStore } from "../stores/messagesStore";
import { useNetworkStore } from "../stores/networkStore";
import { useNotificationsStore } from "../stores/notificationsStore";
import { useAppSocketAction } from "./AppSocketProvider";
import type { WsNotificationPayload } from "./wsProtocol";

const CATEGORY_GROUP_MEMBER_ADDED = "GROUP_MEMBER_ADDED_IN_APP";
const CATEGORY_GROUP_DELETED = "GROUP_DELETED_IN_APP";

function isNotificationPayload(value: unknown): value is WsNotificationPayload {
  return typeof value === "object" && value !== null;
}

function normalizeCategory(category: string | null | undefined): string {
  return (category ?? "").trim().toUpperCase();
}

export function NotificationsSocketBridge() {
  const { authenticated, user } = useAuth();
  const refreshNetwork = useNetworkStore((state) => state.load);

  useAppSocketAction("NOTIFICATION", (packet) => {
    if (!authenticated) {
      return;
    }
    if (!isNotificationPayload(packet.payload)) {
      return;
    }
    const notificationPayload = packet.payload;
    const normalizedCategory = normalizeCategory(notificationPayload.category);

    useNotificationsStore.getState().ingestInApp(notificationPayload);

    if (user?.sub && isFriendNotificationCategory(notificationPayload.category ?? null)) {
      void refreshNetwork(user.sub, true);
    }

    if (!user?.sub || !isGroupMembershipNotificationCategory(normalizedCategory)) {
      return;
    }

    const targetGroupId = notificationPayload.targetId?.trim();
    if (!targetGroupId) {
      return;
    }

    if (normalizedCategory === CATEGORY_GROUP_DELETED) {
      useMessagesStore.getState().removeGroupConversation(targetGroupId);
      return;
    }

    if (normalizedCategory !== CATEGORY_GROUP_MEMBER_ADDED) {
      return;
    }

    void (async () => {
      const loadGroupConversation = async (): Promise<boolean> => {
        try {
          const [group, members] = await Promise.all([
            groupApi.getById(targetGroupId),
            groupApi.getMembers(targetGroupId),
          ]);
          const participantIds = Array.from(
            new Set(
              members
                .map((member) => member.userId)
                .filter((memberUserId): memberUserId is string => Boolean(memberUserId)),
            ),
          );

          useMessagesStore.getState().upsertGroupConversation(group, user.sub, participantIds, {
            select: false,
          });
          return true;
        } catch {
          return false;
        }
      };

      const loaded = await loadGroupConversation();
      if (loaded) {
        return;
      }

      // Small retry to absorb eventual consistency between persistence and reads.
      setTimeout(() => {
        void loadGroupConversation();
      }, 900);
    })();
  });

  return null;
}
