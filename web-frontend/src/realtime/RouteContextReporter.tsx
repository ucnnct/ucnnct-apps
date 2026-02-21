import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppSocket } from "./AppSocketProvider";
import { useMessagesStore } from "../stores/messagesStore";

export function RouteContextReporter() {
  const location = useLocation();
  const { connected, sendAction } = useAppSocket();
  const conversations = useMessagesStore((state) => state.conversations);
  const selectedConversationId = useMessagesStore((state) => state.selectedConversationId);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const conversationReference =
    selectedConversation?.kind === "group"
      ? selectedConversation.groupId ?? undefined
      : selectedConversation?.peerUserId ?? undefined;
  const isConversationPage = location.pathname.startsWith("/messages");

  useEffect(() => {
    if (!connected) {
      return;
    }

    sendAction("UPDATE_ACTIVE_CONTEXT", {
      page: isConversationPage ? "CONVERSATION" : location.pathname,
      conversationId: isConversationPage ? conversationReference : undefined,
      updatedAt: Date.now(),
    });
  }, [connected, conversationReference, isConversationPage, location.pathname, sendAction]);

  return null;
}
