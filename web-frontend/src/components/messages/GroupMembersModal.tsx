import { Loader2, X } from "lucide-react";
import type { GroupMemberRole } from "../../api/groups";

export interface GroupMemberViewItem {
  userId: string;
  role: GroupMemberRole;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  online: boolean;
}

interface GroupMembersModalProps {
  open: boolean;
  groupName: string;
  members: GroupMemberViewItem[];
  loading: boolean;
  error: string | null;
  canRemoveMembers: boolean;
  currentUserId: string | null;
  removingUserIds: Set<string>;
  onRemoveMember: (userId: string) => Promise<void> | void;
  onClose: () => void;
}

function roleLabel(role: GroupMemberRole): string {
  if (role === "OWNER") {
    return "Createur";
  }
  if (role === "ADMIN") {
    return "Admin";
  }
  return "Membre";
}

export default function GroupMembersModal({
  open,
  groupName,
  members,
  loading,
  error,
  canRemoveMembers,
  currentUserId,
  removingUserIds,
  onRemoveMember,
  onClose,
}: GroupMembersModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[130] bg-primary-900/30 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-secondary-100 rounded-sm shadow-xl">
        <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary-900 truncate">{groupName}</p>
            <p className="text-[11px] text-secondary-400">Membres du groupe</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary-400 hover:text-primary-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto divide-y divide-secondary-100">
          {loading && (
            <div className="px-5 py-8 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-primary-500" />
            </div>
          )}

          {!loading && error && (
            <div className="px-5 py-4">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && members.length === 0 && (
            <div className="px-5 py-4">
              <p className="text-xs text-secondary-400">Aucun membre.</p>
            </div>
          )}

          {!loading &&
            !error &&
            members.map((member) => {
              const isOwner = member.role === "OWNER";
              const isCurrentUser = member.userId === currentUserId;
              const canRemove =
                canRemoveMembers && !isOwner && !isCurrentUser;
              const removing = removingUserIds.has(member.userId);

              return (
                <div key={member.userId} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-9 h-9 avatar-sharp shrink-0">
                        <img
                          src={
                            member.avatarUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.displayName)}`
                          }
                          alt={member.displayName}
                        />
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border ${
                          member.online
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-white border-secondary-300"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm text-primary-900 truncate">{member.displayName}</p>
                      <p className="text-[11px] text-secondary-400 truncate">
                        {member.handle} · {roleLabel(member.role)}
                      </p>
                    </div>
                  </div>

                  {canRemove && (
                    <button
                      type="button"
                      disabled={removing}
                      onClick={() => void onRemoveMember(member.userId)}
                      className="px-2.5 py-1 text-[11px] uppercase tracking-wide border border-red-200 text-red-500 hover:bg-red-50 rounded-sm disabled:opacity-50"
                    >
                      {removing ? "Suppression..." : "Retirer"}
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

