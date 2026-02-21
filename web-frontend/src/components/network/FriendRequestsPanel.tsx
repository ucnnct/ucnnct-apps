import { Link } from "react-router-dom";
import { Loader2, X } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import type { Friendship } from "../../api/friends";

interface FriendRequestsPanelProps {
  loading: boolean;
  received: Friendship[];
  sent: Friendship[];
  onAccept: (requesterId: string) => Promise<void>;
  onReject: (requesterId: string) => Promise<void>;
}

function resolveDisplayName(firstName: string, lastName: string, username: string): string {
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || username;
}

function resolveHandle(firstName: string, username: string): string {
  if (!username.includes("@")) {
    return username;
  }
  return firstName || username.split("@")[0];
}

function avatarUrlOrFallback(url: string | null, seed: string): string {
  if (url && url.trim().length > 0) {
    return url;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export default function FriendRequestsPanel({
  loading,
  received,
  sent,
  onAccept,
  onReject,
}: FriendRequestsPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <SectionHeader
          label={`${received.length} demande${received.length !== 1 ? "s" : ""} recue${received.length !== 1 ? "s" : ""}`}
        />

        {received.length === 0 ? (
          <EmptyState text="Aucune demande recue pour le moment" />
        ) : (
          <div className="space-y-2">
            {received.map((request) => {
              const requester = request.requester;
              const fullName = resolveDisplayName(
                requester.firstName,
                requester.lastName,
                requester.username,
              );
              const handle = resolveHandle(requester.firstName, requester.username);

              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-primary-50/50 border border-primary-100 rounded-sm"
                >
                  <Link
                    to={`/profile/${requester.keycloakId}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="w-10 h-10 avatar-sharp shrink-0">
                      <img
                        src={avatarUrlOrFallback(requester.avatarUrl ?? null, fullName)}
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
                      onClick={() => void onAccept(requester.keycloakId)}
                      className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium uppercase tracking-wide rounded-sm transition-all"
                    >
                      ACCEPTER
                    </button>
                    <button
                      onClick={() => void onReject(requester.keycloakId)}
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
        )}
      </div>

      <div>
        <SectionHeader
          label={`${sent.length} demande${sent.length !== 1 ? "s" : ""} en attente`}
        />

        {sent.length === 0 ? (
          <EmptyState text="Aucune demande envoyee en attente" />
        ) : (
          <div className="space-y-1">
            {sent.map((request) => {
              const receiver = request.receiver;
              const fullName = resolveDisplayName(
                receiver.firstName,
                receiver.lastName,
                receiver.username,
              );
              const handle = resolveHandle(receiver.firstName, receiver.username);

              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between py-3 px-2 hover:bg-secondary-50 transition-colors rounded-sm"
                >
                  <Link
                    to={`/profile/${receiver.keycloakId}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="w-8 h-8 avatar-sharp shrink-0">
                      <img
                        src={avatarUrlOrFallback(receiver.avatarUrl ?? null, fullName)}
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
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-sm">
      <p className="text-xs font-normal text-secondary-300">{text}</p>
    </div>
  );
}
