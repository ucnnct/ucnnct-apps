import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { UserX, Users, Compass, X, Loader2 } from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import { useNetworkStore } from "../stores/networkStore";
import type { UserProfile } from "../api/users";

type Tab = "discover" | "network";

export default function Cercles() {
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

  return (
    <Layout hideSidebarRight>
      <div className="flex flex-col h-full bg-white font-body">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-900 font-display">Mes Cercles</h1>
          <div className="flex bg-secondary-50 border border-secondary-100 rounded-sm overflow-hidden">
            <ToggleButton
              active={tab === "discover"}
              onClick={() => setTab("discover")}
              icon={<Compass size={14} />}
              label="DECOUVRIR"
            />
            <ToggleButton
              active={tab === "network"}
              onClick={() => setTab("network")}
              icon={<Users size={14} />}
              label="MON RESEAU"
              badge={received.length > 0 ? received.length : undefined}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            </div>
          ) : tab === "discover" ? (
            <div className="p-6">
              {suggestions.length === 0 ? (
                <EmptyState text="Aucune suggestion pour le moment" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {suggestions.map((user) => {
                    const alreadySent = sentIds.has(user.keycloakId);
                    return (
                      <UserCard key={user.keycloakId} user={user}>
                        <button
                          onClick={() => !alreadySent && handleAddFriend(user.keycloakId)}
                          className={`w-full py-2 text-xs font-medium uppercase tracking-wide rounded-sm transition-all ${
                            alreadySent
                              ? "bg-secondary-50 text-secondary-400 border border-secondary-100"
                              : "bg-primary-500 hover:bg-primary-600 text-white active:scale-[0.98]"
                          }`}
                        >
                          {alreadySent ? "DEMANDE ENVOYEE" : "AJOUTER"}
                        </button>
                      </UserCard>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {received.length > 0 && (
                <div>
                  <SectionHeader
                    label={`${received.length} demande${received.length !== 1 ? "s" : ""} recue${received.length !== 1 ? "s" : ""}`}
                  />
                  <div className="space-y-2">
                    {received.map((request) => {
                      const fullName = `${request.requester.firstName} ${request.requester.lastName}`.trim();
                      const handle = request.requester.username.includes("@")
                        ? request.requester.firstName || request.requester.username.split("@")[0]
                        : request.requester.username;

                      return (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 bg-primary-50/50 border border-primary-100 rounded-sm"
                        >
                          <Link
                            to={`/profile/${request.requester.keycloakId}`}
                            className="flex items-center gap-3 min-w-0 flex-1"
                          >
                            <div className="w-10 h-10 avatar-sharp shrink-0">
                              <img
                                src={
                                  request.requester.avatarUrl ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
                                }
                                alt={fullName}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-primary-900 truncate">{fullName}</p>
                              <p className="text-[11px] font-normal text-secondary-400">@{handle}</p>
                            </div>
                          </Link>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleAccept(request.requester.keycloakId)}
                              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium uppercase tracking-wide rounded-sm transition-all"
                            >
                              ACCEPTER
                            </button>
                            <button
                              onClick={() => handleReject(request.requester.keycloakId)}
                              className="p-1.5 border border-secondary-200 hover:border-red-300 hover:text-red-500 text-secondary-400 rounded-sm transition-all"
                              title="Refuser"
                            >
                              <X size={14} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <SectionHeader label={`${friends.length} ami${friends.length !== 1 ? "s" : ""}`} />
                {friends.length === 0 ? (
                  <EmptyState text="Aucun ami pour le moment" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {friends.map((friend) => (
                      <UserCard key={friend.keycloakId} user={friend}>
                        <div className="flex gap-2">
                          <Link
                            to={`/profile/${friend.keycloakId}`}
                            className="flex-1 py-2 text-center text-xs font-medium uppercase tracking-wide border border-secondary-200 hover:bg-secondary-50 text-primary-900 rounded-sm transition-all"
                          >
                            VOIR PROFIL
                          </Link>
                          <button
                            onClick={() => handleRemove(friend.keycloakId)}
                            className="p-2 border border-secondary-200 hover:border-red-300 hover:text-red-500 text-secondary-400 rounded-sm transition-all"
                            title="Retirer"
                          >
                            <UserX size={14} strokeWidth={3} />
                          </button>
                        </div>
                      </UserCard>
                    ))}
                  </div>
                )}
              </div>

              {sent.length > 0 && (
                <div>
                  <SectionHeader
                    label={`${sent.length} demande${sent.length !== 1 ? "s" : ""} en attente`}
                  />
                  <div className="space-y-1">
                    {sent.map((request) => {
                      const fullName = `${request.receiver.firstName} ${request.receiver.lastName}`.trim();
                      const handle = request.receiver.username.includes("@")
                        ? request.receiver.firstName || request.receiver.username.split("@")[0]
                        : request.receiver.username;

                      return (
                        <div
                          key={request.id}
                          className="flex items-center justify-between py-3 px-2 hover:bg-secondary-50 transition-colors rounded-sm"
                        >
                          <Link
                            to={`/profile/${request.receiver.keycloakId}`}
                            className="flex items-center gap-3 min-w-0 flex-1"
                          >
                            <div className="w-8 h-8 avatar-sharp shrink-0">
                              <img
                                src={
                                  request.receiver.avatarUrl ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
                                }
                                alt={fullName}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-primary-900 truncate">{fullName}</p>
                              <p className="text-[11px] font-normal text-secondary-400">@{handle}</p>
                            </div>
                          </Link>
                          <span className="text-[11px] font-normal text-secondary-300">En attente</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wide uppercase transition-all ${
        active ? "bg-white text-primary-500 shadow-sm" : "text-secondary-400 hover:text-secondary-600"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="w-4 h-4 flex items-center justify-center bg-primary-500 text-white text-[9px] font-medium rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function UserCard({
  user,
  children,
}: {
  user: UserProfile;
  children: ReactNode;
}) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const handle = user.username.includes("@")
    ? user.firstName || user.email.split("@")[0]
    : user.username;
  const detail = [user.fieldOfStudy, user.university].filter(Boolean).join(" · ");

  return (
    <div className="border border-secondary-100 rounded-sm overflow-hidden hover:shadow-md transition-all group">
      <div className="h-16 bg-secondary-100 relative">
        <div className="absolute inset-0 bg-linear-to-br from-primary-500/10 to-secondary-200/30" />
        <div className="absolute -bottom-5 left-4">
          <div className="w-14 h-14 bg-white p-0.5 rounded-sm border border-secondary-100 shadow-sm overflow-hidden">
            <img
              src={
                user.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
              }
              alt={fullName}
              className="w-full h-full object-cover rounded-sm"
            />
          </div>
        </div>
      </div>

      <div className="pt-8 px-4 pb-4">
        <Link to={`/profile/${user.keycloakId}`} className="block mb-3 group/link">
          <p className="text-sm font-semibold text-primary-900 truncate group-hover/link:text-primary-500 transition-colors">
            {fullName}
          </p>
          <p className="text-[11px] font-normal text-secondary-400">@{handle}</p>
        </Link>

        {detail && <p className="text-[11px] font-normal text-secondary-400 mb-2 truncate">{detail}</p>}

        {user.bio && <p className="text-sm font-normal text-secondary-500 leading-relaxed mb-3 line-clamp-2">{user.bio}</p>}

        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
      <p className="text-xs font-normal text-secondary-300">{text}</p>
    </div>
  );
}

