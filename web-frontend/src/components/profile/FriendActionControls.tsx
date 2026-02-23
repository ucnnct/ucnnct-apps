import { Check, MessageCircle, Settings, UserMinus, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import type { FriendStatus } from "../../hooks/profile/useProfilePage";

interface FriendActionControlsProps {
  isOwnProfile: boolean;
  friendStatus: FriendStatus;
  actionLoading: boolean;
  profileId: string | null;
  onFriendAction: (action: "add" | "accept" | "remove") => void;
}

export default function FriendActionControls({
  isOwnProfile,
  friendStatus,
  actionLoading,
  profileId,
  onFriendAction,
}: FriendActionControlsProps) {
  if (isOwnProfile) {
    return (
      <Link
        to="/profile/edit"
        className="flex items-center gap-2 px-6 py-2 border border-secondary-200 hover:bg-secondary-50 text-primary-900 font-medium text-xs uppercase tracking-wide rounded-sm transition-all active:scale-95"
      >
        <Settings size={14} />
        MODIFIER LE PROFIL
      </Link>
    );
  }

  return (
    <>
      {friendStatus === "none" && (
        <button
          onClick={() => onFriendAction("add")}
          disabled={actionLoading}
          className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs uppercase tracking-wide rounded-sm transition-all active:scale-95 disabled:opacity-50"
        >
          <UserPlus size={14} strokeWidth={3} />
          AJOUTER EN AMI
        </button>
      )}
      {friendStatus === "pending_sent" && (
        <span className="flex items-center gap-2 px-6 py-2 border border-secondary-200 text-secondary-400 font-medium text-xs uppercase tracking-wide rounded-sm">
          <Check size={14} strokeWidth={3} />
          DEMANDE ENVOYEE
        </span>
      )}
      {friendStatus === "pending_received" && (
        <button
          onClick={() => onFriendAction("accept")}
          disabled={actionLoading}
          className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs uppercase tracking-wide rounded-sm transition-all active:scale-95 disabled:opacity-50"
        >
          <Check size={14} strokeWidth={3} />
          ACCEPTER LA DEMANDE
        </button>
      )}
      {friendStatus === "friends" && (
        <>
          <Link
            to={profileId ? `/messages?kind=peer&target=${encodeURIComponent(profileId)}` : "/messages"}
            className="flex items-center gap-2 px-6 py-2 border border-secondary-200 hover:bg-secondary-50 text-primary-900 font-medium text-xs uppercase tracking-wide rounded-sm transition-all active:scale-95"
          >
            <MessageCircle size={14} strokeWidth={3} />
            ENVOYER MESSAGE
          </Link>
          <button
            onClick={() => onFriendAction("remove")}
            disabled={actionLoading}
            className="flex items-center gap-2 px-6 py-2 border border-red-200 text-red-500 hover:bg-red-50 font-medium text-xs uppercase tracking-wide rounded-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <UserMinus size={14} strokeWidth={3} />
            RETIRER DES AMIS
          </button>
        </>
      )}
    </>
  );
}
