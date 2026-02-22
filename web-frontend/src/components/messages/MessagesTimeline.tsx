import SectionHeader from "../common/SectionHeader";
import type { MessageItem } from "../../stores/messagesStore";
import MessageBubble from "./MessageBubble";

interface MessagesTimelineProps {
  messages: MessageItem[];
  isLoadingMessages: boolean;
  error: string | null;
}

export default function MessagesTimeline({
  messages,
  isLoadingMessages,
  error,
}: MessagesTimelineProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 lg:p-6 space-y-4 lg:space-y-6 no-scrollbar bg-secondary-50/10">
      <div className="hidden lg:block">
        <SectionHeader label="Discussion" />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {isLoadingMessages && (
        <p className="text-xs text-secondary-400">Chargement des messages...</p>
      )}

      {!isLoadingMessages && messages.length === 0 && (
        <p className="text-xs text-secondary-400">
          Aucun message pour le moment.
        </p>
      )}

      <div className="flex flex-col gap-4 lg:gap-6 pb-2">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}
