import { useEffect, useMemo, useState } from "react";
import Layout from "../components/layout/Layout";
import {
  Search,
  MoreHorizontal,
  Send,
  Image as ImageIcon,
  Smile,
  Paperclip,
} from "lucide-react";
import SectionHeader from "../components/common/SectionHeader";
import { useAuth } from "../auth/AuthProvider";
import { useAppSocket } from "../realtime/AppSocketProvider";
import { useMessagesStore, type MessageItem } from "../stores/messagesStore";

function formatConversationTime(isoDate: string | null): string {
  if (!isoDate) {
    return "";
  }
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();

  if (diffMs < 60_000) {
    return "now";
  }
  if (diffMs < 3_600_000) {
    return `${Math.floor(diffMs / 60_000)}m`;
  }
  if (diffMs < 86_400_000) {
    return `${Math.floor(diffMs / 3_600_000)}h`;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatMessageTime(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export default function Messages() {
  const { user } = useAuth();
  const { connected: isWsConnected, sendAction } = useAppSocket();
  const [draft, setDraft] = useState("");

  const conversations = useMessagesStore((state) => state.conversations);
  const selectedConversationId = useMessagesStore((state) => state.selectedConversationId);
  const messagesByConversationId = useMessagesStore((state) => state.messagesByConversationId);
  const loadingConversations = useMessagesStore((state) => state.loadingConversations);
  const loadingMessagesByConversationId = useMessagesStore(
    (state) => state.loadingMessagesByConversationId,
  );
  const error = useMessagesStore((state) => state.error);
  const bootstrap = useMessagesStore((state) => state.bootstrap);
  const selectConversation = useMessagesStore((state) => state.selectConversation);
  const reset = useMessagesStore((state) => state.reset);

  useEffect(() => {
    if (!user) {
      reset();
      return;
    }
    void bootstrap(user);
  }, [bootstrap, reset, user]);

  const selectedConversation = useMemo(() => {
    if (conversations.length === 0) {
      return null;
    }
    return conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0];
  }, [conversations, selectedConversationId]);

  const selectedMessages = selectedConversation
    ? messagesByConversationId[selectedConversation.id] ?? []
    : [];
  const isLoadingMessages = selectedConversation
    ? Boolean(loadingMessagesByConversationId[selectedConversation.id])
    : false;

  const handleConversationSelect = (conversationId: string) => {
    if (!user?.sub) {
      return;
    }
    void selectConversation(conversationId, user.sub);
  };

  const handleSendMessage = () => {
    if (!selectedConversation) {
      return;
    }

    const content = draft.trim();
    if (!content) {
      return;
    }

    let sent = false;
    if (selectedConversation.kind === "group" && selectedConversation.groupId) {
      sent = sendAction("SEND_GROUP_MESSAGE", {
        groupId: selectedConversation.groupId,
        content,
      });
    } else if (selectedConversation.kind === "peer" && selectedConversation.peerUserId) {
      sent = sendAction("SEND_PRIVATE_MESSAGE", {
        receiversId: [selectedConversation.peerUserId],
        content,
      });
    }

    if (sent) {
      setDraft("");
    }
  };

  return (
    <Layout hideSidebarRight>
      <div className="flex h-full bg-white overflow-hidden font-body">
        <div className="w-[350px] border-r border-secondary-100 flex flex-col h-full bg-white shrink-0">
          <div className="p-6 border-b border-secondary-100">
            <h1 className="text-xl font-bold text-primary-900 mb-4 font-display">
              Messages
            </h1>
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
              return (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation.id)}
                  className={`p-4 flex gap-3 cursor-pointer border-l-2 transition-all ${
                    selectedConversation?.id === conversation.id
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
                      <p
                        className={`text-sm font-semibold truncate ${unread ? "text-primary-900" : "text-secondary-700"}`}
                      >
                        {conversation.title}
                      </p>
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

        <div className="flex-1 flex flex-col h-full bg-white">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-sm text-secondary-400">
              Selectionne une conversation pour commencer.
            </div>
          ) : (
            <>
              <div className="h-[73px] px-6 border-b border-secondary-100 flex items-center justify-between bg-white/95 backdrop-blur-sm sticky top-0 z-10 font-display">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedConversation.kind === "group" ? (
                      <GroupAvatar seeds={selectedConversation.avatarSeeds} />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedConversation.avatarSeeds[0] ?? selectedConversation.title)}`}
                        alt={selectedConversation.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-900 truncate">
                      {selectedConversation.title}
                    </p>
                    <p className="text-[11px] font-normal text-secondary-400 truncate">
                      {selectedConversation.kind === "group"
                        ? selectedConversation.subtitle
                        : isWsConnected
                          ? "En ligne (WS)"
                          : "Hors ligne (WS)"}
                    </p>
                  </div>
                </div>
                <button className="text-secondary-400 hover:text-primary-500 transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-secondary-50/10">
                <SectionHeader label="Discussion" />

                {error && <p className="text-xs text-red-500">{error}</p>}
                {isLoadingMessages && (
                  <p className="text-xs text-secondary-400">Chargement des messages...</p>
                )}

                {!isLoadingMessages && selectedMessages.length === 0 && (
                  <p className="text-xs text-secondary-400">
                    Aucun message pour le moment.
                  </p>
                )}

                <div className="flex flex-col gap-6">
                  {selectedMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-secondary-100 bg-white">
                <div className="flex items-end gap-2 bg-secondary-50 border border-secondary-100 focus-within:bg-white focus-within:border-primary-500 transition-all rounded-sm p-2">
                  <div className="flex gap-1 mb-1">
                    <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                      <ImageIcon size={18} />
                    </button>
                    <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                      <Paperclip size={18} />
                    </button>
                    <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
                      <Smile size={18} />
                    </button>
                  </div>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={isWsConnected ? "Votre message..." : "WS deconnecte"}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-primary-900 placeholder:text-secondary-300 resize-none h-10 py-2 font-normal"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!isWsConnected || draft.trim().length === 0}
                    className="mb-1 p-2 bg-primary-500 hover:bg-primary-600 disabled:bg-secondary-200 disabled:cursor-not-allowed text-white rounded-sm transition-all group"
                  >
                    <Send
                      size={18}
                      className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function GroupAvatar({ seeds }: { seeds: string[] }) {
  const avatarSeeds = seeds.length > 0 ? seeds.slice(0, 4) : ["Groupe"];
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
      {avatarSeeds.map((seed, index) => (
        <div key={`${seed}-${index}`} className="overflow-hidden border-[0.5px] border-white/20">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`}
            alt="member"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: MessageItem }) {
  return (
    <div
      className={`flex ${message.isOwn ? "justify-end" : "justify-start"} items-end gap-3`}
    >
      {!message.isOwn && (
        <div className="w-8 h-8 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(message.senderLabel)}`}
            alt={message.senderLabel}
          />
        </div>
      )}
      <div
        className={`max-w-[70%] group flex flex-col ${message.isOwn ? "items-end" : "items-start"}`}
      >
        {!message.isOwn && (
          <p className="text-[11px] font-semibold text-secondary-400 mb-1 ml-1">
            {message.senderLabel}
          </p>
        )}
        <div
          className={`p-3 rounded-sm border transition-all ${
            message.isOwn
              ? "bg-primary-500 border-primary-600 text-white"
              : "bg-white border-secondary-100 text-primary-900"
          }`}
        >
          <p className="text-sm font-normal leading-relaxed">{message.content}</p>
        </div>
        <p className="text-[11px] font-normal text-secondary-300 mt-1">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
