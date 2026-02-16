import { useEffect, useState } from "react";
import { UserPlus, Check, Clock, CalendarDays, BookOpen, Loader2 } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import { useAuth } from "../../auth/AuthProvider";
import { userApi, type UserProfile } from "../../api/users";
import { friendApi } from "../../api/friends";

export default function SidebarRight() {
  const { user: authUser } = useAuth();
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    Promise.all([
      userApi.getAll(),
      friendApi.getMyFriends(),
      friendApi.getSentRequests(),
      friendApi.getPendingRequests(),
    ]).then(([allUsers, friends, sent, pending]) => {
      const friendIds = new Set(friends.map((f) => f.keycloakId));
      const sentKeycloakIds = new Set(sent.map((s) => s.receiver.keycloakId));
      const pendingIds = new Set(pending.map((p) => p.requester.keycloakId));
      const excludeIds = new Set([authUser.sub, ...friendIds, ...sentKeycloakIds, ...pendingIds]);
      setSuggestions(allUsers.filter((u) => !excludeIds.has(u.keycloakId)).slice(0, 5));
      setSentIds(sentKeycloakIds);
    }).catch(() => {}).finally(() => setLoadingSuggestions(false));
  }, [authUser]);

  const handleAddFriend = async (keycloakId: string) => {
    try {
      await friendApi.sendRequest(keycloakId);
      setSentIds((prev) => new Set([...prev, keycloakId]));
    } catch { /* ignore */ }
  };

  return (
    <aside className="hidden xl:flex flex-col w-[320px] h-full py-6 space-y-8 shrink-0 overflow-y-auto no-scrollbar">
      <Panel>
        <div className="bg-primary-50 border border-primary-100 p-4 rounded-sm">
          <div className="flex items-center gap-2 mb-2 text-primary-600">
            <Clock size={12} strokeWidth={3} />
            <span className="text-[11px] font-medium uppercase tracking-widest">
              Prochain cours
            </span>
          </div>
          <p className="text-sm font-semibold text-primary-900">
            Architecture Cloud
          </p>
          <p className="text-[11px] font-normal text-primary-500 mt-1 text-right">
            15:00 · Salle D20
          </p>
        </div>

        <div className="flex gap-3">
          <div className="mt-1">
            <CalendarDays size={14} className="text-accent-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-900 leading-tight">
              Hackathon U-Connect
            </p>
            <p className="text-[11px] font-normal text-secondary-400 mt-1">
              Demain · 09:00
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="mt-1">
            <BookOpen size={14} className="text-success-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-900 leading-tight">
              Rendu Projet Maths
            </p>
            <p className="text-[11px] font-normal text-secondary-400 mt-1">
              Vendredi · 23:59
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Tendances">
        {[
          { tag: "#STAGE2026", desc: "1.2K posts" },
          { tag: "#CHATGPT", desc: "IA sur le campus" },
          { tag: "#MATHS_HELP", desc: "Entraide active" },
        ].map((item, i) => (
          <div key={i} className="group cursor-pointer">
            <p className="text-sm font-semibold text-primary-900 group-hover:text-primary-500 transition-colors">
              {item.tag}
            </p>
            <p className="text-[11px] font-normal text-secondary-400 mt-1">
              {item.desc}
            </p>
          </div>
        ))}
      </Panel>

      <Panel title="Suggestions">
        {loadingSuggestions ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-secondary-300" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-[11px] font-normal text-secondary-400">
            Aucune suggestion
          </p>
        ) : (
          suggestions.map((u) => {
            const fullName = `${u.firstName} ${u.lastName}`.trim();
            const handle = u.username.includes("@") ? u.firstName || u.email.split("@")[0] : u.username;
            const alreadySent = sentIds.has(u.keycloakId);
            return (
              <div
                key={u.keycloakId}
                className="flex items-center justify-between group cursor-pointer py-1 hover:bg-secondary transition-colors rounded-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 avatar-sharp shrink-0">
                    <img
                      src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`}
                      alt={fullName}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-900 truncate">
                      {fullName}
                    </p>
                    <p className="text-[11px] font-normal text-secondary-400">
                      @{handle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !alreadySent && handleAddFriend(u.keycloakId)}
                  className={`shrink-0 transition-colors ${alreadySent ? "text-success-500" : "text-primary-500 hover:text-primary-700"}`}
                  title={alreadySent ? "Demande envoyée" : "Ajouter en ami"}
                >
                  {alreadySent ? <Check size={16} strokeWidth={3} /> : <UserPlus size={16} strokeWidth={3} />}
                </button>
              </div>
            );
          })
        )}
      </Panel>

      <footer className="mt-auto px-6 py-4 border-t border-secondary">
        <p className="text-[11px] font-normal text-secondary-400 leading-relaxed">
          © 2026 U-Connect
        </p>
      </footer>
    </aside>
  );
}

const Panel = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="px-6">
      {title && <SectionHeader label={title} />}
      <div className="space-y-4">{children}</div>
    </div>
  );
};
