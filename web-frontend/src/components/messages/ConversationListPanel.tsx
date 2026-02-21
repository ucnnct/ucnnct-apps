import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import type { MessageConversationItem } from "../../stores/messagesStore";
import { formatConversationTime } from "./utils";
import GroupAvatar from "./GroupAvatar";

interface ConversationListPanelProps {
  conversations: MessageConversationItem[];
  presenceByUserId: Record<string, boolean>;
  activeUserId: string | null;
  selectedConversationId: string | null;
  loadingConversations: boolean;
  onSelectConversation: (conversationId: string) => void;
  onRequestCreateGroup: () => void;
}

export default function ConversationListPanel({
  conversations,
  presenceByUserId,
  activeUserId,
  selectedConversationId,
  loadingConversations,
  onSelectConversation,
  onRequestCreateGroup,
}: ConversationListPanelProps) {
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

  return (
    <div className="w-[350px] border-r border-secondary-100 flex flex-col h-full bg-white shrink-0">
      <div className="p-6 border-b border-secondary-100">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-900 font-display">Messages</h1>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((current) => !current)}
              className="text-secondary-400 hover:text-primary-500 transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-secondary-100 rounded-sm shadow-lg z-40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onRequestCreateGroup();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-primary-900 hover:bg-secondary-50"
                >
                  Creer un groupe
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full bg-secondary-50 border border-secondary-100 focus:bg-white focus:border-primary-500 focus:ring-0 rounded-sm py-2 pl-10 pr-4 text-xs font-normal tracking-normal transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loadingConversations && conversations.length === 0 && (
          <div className="p-6 text-sm text-secondary-400">Chargement des conversations...</div>
        )}
        {!loadingConversations && conversations.length === 0 && (
          <div className="p-6 text-sm text-secondary-400">Aucune conversation.</div>
        )}

        {conversations.map((conversation) => {
          const unread = conversation.unreadCount > 0;
          const isPeerOnline =
            conversation.kind === "peer" && conversation.peerUserId
              ? Boolean(presenceByUserId[conversation.peerUserId])
              : false;
          const groupOnlineCount =
            conversation.kind === "group"
              ? conversation.participantIds.filter(
                  (participantId) =>
                    participantId !== activeUserId && Boolean(presenceByUserId[participantId]),
                ).length
              : 0;

          return (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`p-4 flex gap-3 cursor-pointer border-l-2 transition-all ${
                selectedConversationId === conversation.id
                  ? "bg-primary-50/30 border-primary-500"
                  : "border-transparent hover:bg-secondary-50"
              }`}
            >
              <div className="w-12 h-12 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
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
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {conversation.kind === "peer" && (
                      <span
                        className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                          isPeerOnline
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-white border-secondary-300"
                        }`}
                      />
                    )}
                    <p
                      className={`text-sm font-semibold truncate ${unread ? "text-primary-900" : "text-secondary-700"}`}
                    >
                      {conversation.title}
                    </p>
                    {conversation.kind === "group" && (
                      <span className="text-[11px] font-normal text-emerald-600 shrink-0">
                        {groupOnlineCount} en ligne
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-normal text-secondary-400 shrink-0">
                    {formatConversationTime(conversation.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm truncate leading-snug ${unread ? "font-semibold text-primary-900" : "font-normal text-secondary-500"}`}
                  >
                    {conversation.lastMessagePreview}
                  </p>
                  {unread && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-primary-500 text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
