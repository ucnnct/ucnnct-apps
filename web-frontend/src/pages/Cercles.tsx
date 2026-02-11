import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { UserX, Users, Compass, X, Loader2 } from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import { friendApi, type Friendship } from "../api/friends";
import { userApi, type UserProfile } from "../api/users";

type Tab = "discover" | "network";

export default function Cercles() {
  const { user: authUser } = useAuth();
  const [tab, setTab] = useState<Tab>("discover");
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [received, setReceived] = useState<Friendship[]>([]);
  const [sent, setSent] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    if (!authUser) return;
    setLoading(true);
    Promise.all([
      friendApi.getMyFriends(),
      friendApi.getPendingRequests(),
      friendApi.getSentRequests(),
      userApi.getAll(),
    ])
      .then(([f, r, s, allUsers]) => {
        setFriends(f);
        setReceived(r);
        setSent(s);

        const friendIds = new Set(f.map((u) => u.keycloakId));
        const sentKeycloakIds = new Set(
          s.map((req) => req.receiver.keycloakId),
        );
        const pendingIds = new Set(r.map((req) => req.requester.keycloakId));
        const excludeIds = new Set([
          authUser.sub,
          ...friendIds,
          ...sentKeycloakIds,
          ...pendingIds,
        ]);
        setSuggestions(allUsers.filter((u) => !excludeIds.has(u.keycloakId)));
        setSentIds(sentKeycloakIds);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [authUser]);

  const handleAddFriend = async (keycloakId: string) => {
    try {
      await friendApi.sendRequest(keycloakId);
      setSentIds((prev) => new Set([...prev, keycloakId]));
    } catch {
      /* ignore */
    }
  };

  const handleAccept = async (requesterId: string) => {
    await friendApi.accept(requesterId);
    loadData();
  };

  const handleReject = async (requesterId: string) => {
    await friendApi.reject(requesterId);
    loadData();
  };

  const handleRemove = async (friendId: string) => {
    await friendApi.remove(friendId);
    loadData();
  };

  return (
    <Layout hideSidebarRight>
      <div className="flex flex-col h-full bg-white font-body">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
          <h1 className="text-xl font-black text-primary-900 uppercase tracking-tight font-display">
            Mes Cercles
          </h1>
          <div className="flex bg-secondary-50 border border-secondary-100 rounded-sm overflow-hidden">
            <ToggleButton
              active={tab === "discover"}
              onClick={() => setTab("discover")}
              icon={<Compass size={14} />}
              label="DÉCOUVRIR"
            />
            <ToggleButton
              active={tab === "network"}
              onClick={() => setTab("network")}
              icon={<Users size={14} />}
              label="MON RÉSEAU"
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
                  {suggestions.map((u) => {
                    const alreadySent = sentIds.has(u.keycloakId);
                    return (
                      <UserCard key={u.keycloakId} user={u}>
                        <button
                          onClick={() =>
                            !alreadySent && handleAddFriend(u.keycloakId)
                          }
                          className={`w-full py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${
                            alreadySent
                              ? "bg-secondary-50 text-secondary-400 border border-secondary-100"
                              : "bg-primary-500 hover:bg-primary-600 text-white active:scale-[0.98]"
                          }`}
                        >
                          {alreadySent ? "DEMANDE ENVOYÉE" : "AJOUTER"}
                        </button>
                      </UserCard>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Demandes reçues */}
              {received.length > 0 && (
                <div>
                  <SectionHeader
                    label={`${received.length} demande${received.length !== 1 ? "s" : ""} reçue${received.length !== 1 ? "s" : ""}`}
                  />
                  <div className="space-y-2">
                    {received.map((r) => {
                      const fullName =
                        `${r.requester.firstName} ${r.requester.lastName}`.trim();
                      const handle = r.requester.username.includes("@")
                        ? r.requester.firstName ||
                          r.requester.username.split("@")[0]
                        : r.requester.username;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-3 bg-primary-50/50 border border-primary-100 rounded-sm"
                        >
                          <Link
                            to={`/profile/${r.requester.keycloakId}`}
                            className="flex items-center gap-3 min-w-0 flex-1"
                          >
                            <div className="w-10 h-10 avatar-sharp shrink-0">
                              <img
                                src={r.requester.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`}
                                alt={fullName}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-primary-900 uppercase truncate tracking-tight">
                                {fullName}
                              </p>
                              <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest">
                                @{handle.toUpperCase()}
                              </p>
                            </div>
                          </Link>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() =>
                                handleAccept(r.requester.keycloakId)
                              }
                              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-[9px] font-black uppercase tracking-widest rounded-sm transition-all"
                            >
                              ACCEPTER
                            </button>
                            <button
                              onClick={() =>
                                handleReject(r.requester.keycloakId)
                              }
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

              {/* Amis */}
              <div>
                <SectionHeader
                  label={`${friends.length} ami${friends.length !== 1 ? "s" : ""}`}
                />
                {friends.length === 0 ? (
                  <EmptyState text="Aucun ami pour le moment" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {friends.map((f) => (
                      <UserCard key={f.keycloakId} user={f}>
                        <div className="flex gap-2">
                          <Link
                            to={`/profile/${f.keycloakId}`}
                            className="flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest border border-secondary-200 hover:bg-secondary-50 text-primary-900 rounded-sm transition-all"
                          >
                            VOIR PROFIL
                          </Link>
                          <button
                            onClick={() => handleRemove(f.keycloakId)}
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

              {/* Demandes envoyées */}
              {sent.length > 0 && (
                <div>
                  <SectionHeader
                    label={`${sent.length} demande${sent.length !== 1 ? "s" : ""} en attente`}
                  />
                  <div className="space-y-1">
                    {sent.map((s) => {
                      const fullName =
                        `${s.receiver.firstName} ${s.receiver.lastName}`.trim();
                      const handle = s.receiver.username.includes("@")
                        ? s.receiver.firstName ||
                          s.receiver.username.split("@")[0]
                        : s.receiver.username;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between py-3 px-2 hover:bg-secondary-50 transition-colors rounded-sm"
                        >
                          <Link
                            to={`/profile/${s.receiver.keycloakId}`}
                            className="flex items-center gap-3 min-w-0 flex-1"
                          >
                            <div className="w-8 h-8 avatar-sharp shrink-0">
                              <img
                                src={s.receiver.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`}
                                alt={fullName}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-primary-900 uppercase truncate tracking-tight">
                                {fullName}
                              </p>
                              <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest">
                                @{handle.toUpperCase()}
                              </p>
                            </div>
                          </Link>
                          <span className="text-[9px] font-black text-secondary-300 uppercase tracking-widest">
                            En attente
                          </span>
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
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black tracking-widest transition-all ${
        active
          ? "bg-white text-primary-500 shadow-sm"
          : "text-secondary-400 hover:text-secondary-600"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="w-4 h-4 flex items-center justify-center bg-primary-500 text-white text-[8px] font-black rounded-full">
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
  children: React.ReactNode;
}) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const handle = user.username.includes("@")
    ? user.firstName || user.email.split("@")[0]
    : user.username;
  const detail = [user.fieldOfStudy, user.university]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border border-secondary-100 rounded-sm overflow-hidden hover:shadow-md transition-all group">
      {/* Banner + avatar */}
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
        <Link
          to={`/profile/${user.keycloakId}`}
          className="block mb-3 group/link"
        >
          <p className="text-[11px] font-black text-primary-900 uppercase tracking-tight truncate group-hover/link:text-primary-500 transition-colors">
            {fullName}
          </p>
          <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest">
            @{handle.toUpperCase()}
          </p>
        </Link>

        {detail && (
          <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest mb-2 truncate">
            {detail}
          </p>
        )}

        {user.bio && (
          <p className="text-[11px] text-secondary-500 leading-relaxed mb-3 line-clamp-2">
            {user.bio}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
      <p className="text-[10px] font-black text-secondary-300 uppercase tracking-[0.3em]">
        {text}
      </p>
    </div>
  );
}
