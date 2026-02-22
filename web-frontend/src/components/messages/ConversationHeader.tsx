import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import type { MessageConversationItem } from "../../stores/messagesStore";
import GroupAvatar from "./GroupAvatar";

interface ConversationHeaderProps {
  conversation: MessageConversationItem;
  isPeerOnline: boolean;
  groupOnlineCount: number;
  typingLabel?: string | null;
  onRequestOpenGroupMembers: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function ConversationHeader({
  conversation,
  isPeerOnline,
  groupOnlineCount,
  typingLabel = null,
  onRequestOpenGroupMembers,
  showBackButton = false,
  onBack,
}: ConversationHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showMenu]);

  const groupSubtitle =
    conversation.kind === "group"
      ? `${conversation.subtitle} - ${groupOnlineCount} en ligne`
      : null;

  const subtitleText =
    typingLabel ??
    (conversation.kind === "group" ? groupSubtitle : isPeerOnline ? "En ligne" : "Hors ligne");

  return (
    <div className="h-[68px] lg:h-[73px] px-4 lg:px-6 border-b border-secondary-100 flex items-center justify-between bg-white/95 backdrop-blur-sm sticky top-0 z-10 font-display">
      <div className="flex items-center gap-3 min-w-0">
        {showBackButton && (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden p-2 -ml-2 rounded-sm text-secondary-500 hover:text-primary-600 hover:bg-secondary-100 transition-colors"
            aria-label="Retour a la liste des conversations"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="w-10 h-10 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
          {conversation.kind === "group" ? (
            <GroupAvatar seeds={conversation.avatarSeeds} />
          ) : (
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(conversation.avatarSeeds[0] ?? conversation.title)}`}
              alt={conversation.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-900 truncate">{conversation.title}</p>
          <p className="text-[11px] font-normal text-secondary-400 truncate">{subtitleText}</p>
        </div>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => {
            if (conversation.kind !== "group") {
              return;
            }
            setShowMenu((current) => !current);
          }}
          className={`transition-colors ${
            conversation.kind === "group"
              ? "text-secondary-400 hover:text-primary-500"
              : "text-secondary-200 cursor-default"
          }`}
        >
          <MoreHorizontal size={20} />
        </button>

        {conversation.kind === "group" && showMenu && (
          <div className="absolute right-0 mt-2 w-44 bg-white border border-secondary-100 rounded-sm shadow-lg z-40 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onRequestOpenGroupMembers();
              }}
              className="w-full text-left px-3 py-2 text-xs text-primary-900 hover:bg-secondary-50"
            >
              Voir les membres
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
