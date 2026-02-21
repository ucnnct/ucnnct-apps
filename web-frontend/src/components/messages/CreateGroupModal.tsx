import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { UserProfile } from "../../api/users";

interface CreateGroupModalProps {
  open: boolean;
  friends: UserProfile[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { name: string; description: string | null; friendIds: string[] }) => Promise<void> | void;
}

function resolveFriendLabel(friend: UserProfile): string {
  const fullName = `${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim();
  return fullName || friend.username || friend.email || friend.keycloakId;
}

function resolveFriendHandle(friend: UserProfile): string {
  const username = friend.username ?? "";
  if (username.includes("@")) {
    return `@${friend.email.split("@")[0]}`;
  }
  return `@${username}`;
}

export default function CreateGroupModal({
  open,
  friends,
  submitting,
  error,
  onClose,
  onSubmit,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setSelectedFriendIds(new Set());
    }
  }, [open]);

  const selectedCount = selectedFriendIds.size;
  const canSubmit = name.trim().length > 1 && selectedCount > 0 && !submitting;
  const sortedFriends = useMemo(
    () =>
      [...friends].sort((left, right) =>
        resolveFriendLabel(left).localeCompare(resolveFriendLabel(right), "fr"),
      ),
    [friends],
  );

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((previous) => {
      const next = new Set(previous);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      friendIds: Array.from(selectedFriendIds),
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-primary-900/30 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-secondary-100 rounded-sm shadow-xl">
        <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary-900">Creer un groupe</p>
            <p className="text-[11px] text-secondary-400">Ajoute uniquement des amis.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-secondary-400 hover:text-primary-700 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wide text-secondary-500">Nom du groupe</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Projet IA M2"
              className="w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm py-2 px-3 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wide text-secondary-500">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 rounded-sm py-2 px-3 text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wide text-secondary-500">Membres ({selectedCount})</label>
            </div>
            <div className="max-h-60 overflow-y-auto border border-secondary-100 rounded-sm divide-y divide-secondary-100">
              {sortedFriends.length === 0 && (
                <p className="px-3 py-4 text-xs text-secondary-400">Aucun ami disponible.</p>
              )}
              {sortedFriends.map((friend) => {
                const checked = selectedFriendIds.has(friend.keycloakId);
                const label = resolveFriendLabel(friend);
                const handle = resolveFriendHandle(friend);

                return (
                  <label
                    key={friend.keycloakId}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFriend(friend.keycloakId)}
                      className="w-4 h-4 accent-primary-500"
                    />
                    <div className="w-8 h-8 avatar-sharp shrink-0">
                      <img
                        src={
                          friend.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(label)}`
                        }
                        alt={label}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-primary-900 truncate">{label}</p>
                      <p className="text-[11px] text-secondary-400 truncate">{handle}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-secondary-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs uppercase tracking-wide border border-secondary-200 text-primary-900 rounded-sm hover:bg-secondary-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="px-4 py-2 text-xs uppercase tracking-wide bg-primary-500 hover:bg-primary-600 text-white rounded-sm disabled:bg-secondary-200 disabled:text-secondary-500 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Creer le groupe
          </button>
        </div>
      </div>
    </div>
  );
}

