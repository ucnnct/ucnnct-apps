import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppSocket } from "./AppSocketProvider";
import { useMessagesStore } from "../stores/messagesStore";

export function RouteContextReporter() {
  const location = useLocation();
  const { connected, sendAction } = useAppSocket();
  const selectedConversationId = useMessagesStore((state) => state.selectedConversationId);

  useEffect(() => {
    if (!connected) {
      return;
    }

    sendAction("UPDATE_ACTIVE_CONTEXT", {
      page: location.pathname,
      conversationId:
        location.pathname.startsWith("/messages") ? selectedConversationId ?? undefined : undefined,
      updatedAt: Date.now(),
    });
  }, [connected, location.pathname, selectedConversationId, sendAction]);

  return null;
}
