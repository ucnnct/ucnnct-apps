import { useEffect } from "react";
import Layout from "../components/layout/Layout";
import { useAuth } from "../auth/AuthProvider";
import { useNetworkStore } from "../stores/networkStore";
import { FriendRequestsPanel } from "../components/network";

export default function FriendRequests() {
  const { user } = useAuth();

  const loading = useNetworkStore((state) => state.loading);
  const received = useNetworkStore((state) => state.received);
  const sent = useNetworkStore((state) => state.sent);
  const load = useNetworkStore((state) => state.load);
  const acceptRequest = useNetworkStore((state) => state.acceptRequest);
  const rejectRequest = useNetworkStore((state) => state.rejectRequest);

  useEffect(() => {
    if (!user?.sub) {
      return;
    }
    void load(user.sub);
  }, [load, user?.sub]);

  const handleAccept = async (requesterId: string) => {
    if (!user?.sub) {
      return;
    }
    await acceptRequest(requesterId, user.sub);
  };

  const handleReject = async (requesterId: string) => {
    if (!user?.sub) {
      return;
    }
    await rejectRequest(requesterId, user.sub);
  };

  return (
    <Layout hideSidebarRight>
      <div className="flex flex-col h-full bg-white font-body">
        <div className="p-6 border-b border-secondary-100">
          <h1 className="text-xl font-bold text-primary-900 font-display">
            Demandes d'amis
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <FriendRequestsPanel
            loading={loading}
            received={received}
            sent={sent}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </div>
      </div>
    </Layout>
  );
}
