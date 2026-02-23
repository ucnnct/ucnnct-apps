import { useEffect, useRef } from "react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef<number>(0);

  useEffect(() => {
    if (isLoadingMessages) {
      return;
    }

    if (messages.length === 0) {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = 0;
      }
      previousMessageCountRef.current = 0;
      return;
    }

    const hasNewMessage = messages.length > previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;

    bottomAnchorRef.current?.scrollIntoView({
      behavior: hasNewMessage ? "smooth" : "auto",
      block: "end",
    });
  }, [isLoadingMessages, messages]);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4 lg:p-6 space-y-4 lg:space-y-6 no-scrollbar bg-secondary-50/10"
      ref={scrollerRef}
    >
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
        <div ref={bottomAnchorRef} />
      </div>
    </div>
  );
}
