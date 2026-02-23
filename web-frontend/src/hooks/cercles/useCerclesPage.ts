import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useNetworkStore } from "../../stores/networkStore";

type Tab = "discover" | "network";

interface UseCerclesPageResult {
  tab: Tab;
  setTab: (tab: Tab) => void;
  loading: boolean;
  friends: ReturnType<typeof useNetworkStore.getState>["friends"];
  received: ReturnType<typeof useNetworkStore.getState>["received"];
  sent: ReturnType<typeof useNetworkStore.getState>["sent"];
  suggestions: ReturnType<typeof useNetworkStore.getState>["suggestions"];
  sentIds: ReturnType<typeof useNetworkStore.getState>["sentIds"];
  handleAddFriend: (keycloakId: string) => Promise<void>;
  handleAccept: (requesterId: string) => Promise<void>;
  handleReject: (requesterId: string) => Promise<void>;
  handleRemove: (friendId: string) => Promise<void>;
}

export function useCerclesPage(): UseCerclesPageResult {
  const { user: authUser } = useAuth();
  const [tab, setTab] = useState<Tab>("discover");

  const loading = useNetworkStore((state) => state.loading);
  const friends = useNetworkStore((state) => state.friends);
  const received = useNetworkStore((state) => state.received);
  const sent = useNetworkStore((state) => state.sent);
  const suggestions = useNetworkStore((state) => state.suggestions);
  const sentIds = useNetworkStore((state) => state.sentIds);
  const load = useNetworkStore((state) => state.load);
  const sendRequest = useNetworkStore((state) => state.sendRequest);
  const acceptRequest = useNetworkStore((state) => state.acceptRequest);
  const rejectRequest = useNetworkStore((state) => state.rejectRequest);
  const removeFriend = useNetworkStore((state) => state.removeFriend);

  useEffect(() => {
    if (!authUser?.sub) {
      return;
    }
    void load(authUser.sub);
  }, [authUser?.sub, load]);

  const handleAddFriend = async (keycloakId: string) => {
    try {
      await sendRequest(keycloakId);
    } catch {
      // ignore
    }
  };

  const handleAccept = async (requesterId: string) => {
    if (!authUser?.sub) {
      return;
    }
    await acceptRequest(requesterId, authUser.sub);
  };

  const handleReject = async (requesterId: string) => {
    if (!authUser?.sub) {
      return;
    }
    await rejectRequest(requesterId, authUser.sub);
  };

  const handleRemove = async (friendId: string) => {
    if (!authUser?.sub) {
      return;
    }
    await removeFriend(friendId, authUser.sub);
  };

  return {
    tab,
    setTab,
    loading,
    friends,
    received,
    sent,
    suggestions,
    sentIds,
    handleAddFriend,
    handleAccept,
    handleReject,
    handleRemove,
  };
}
