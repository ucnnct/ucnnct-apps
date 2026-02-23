import { useEffect, useRef } from "react";
import type { WsInboundActionType } from "../../realtime/wsProtocol";
import type { MessageConversationItem, MessageItem } from "../../stores/messagesStore";

type SendAction = <TPayload = unknown>(
  actionType: WsInboundActionType,
  payload: TPayload,
) => boolean;

interface UseMessageReadAcksArgs {
  userId: string | null;
  isWsConnected: boolean;
  selectedConversation: MessageConversationItem | null;
  selectedMessages: MessageItem[];
  sendAction: SendAction;
}

export function useMessageReadAcks({
  userId,
  isWsConnected,
  selectedConversation,
  selectedMessages,
  sendAction,
}: UseMessageReadAcksArgs): void {
  const readAckSentMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      readAckSentMessageIdsRef.current.clear();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !isWsConnected || !selectedConversation) {
      return;
    }

    const type = selectedConversation.kind === "group" ? "GROUP" : "PRIVATE";
    const groupId =
      selectedConversation.kind === "group" && selectedConversation.groupId
        ? selectedConversation.groupId
        : undefined;

    for (const message of selectedMessages) {
      if (
        message.isOwn ||
        message.status === "READ" ||
        readAckSentMessageIdsRef.current.has(message.id)
      ) {
        continue;
      }

      const readAckSent = sendAction("MESSAGE_READ", {
        messageId: message.id,
        senderId: message.senderId,
        type,
        groupId,
      });

      if (readAckSent) {
        readAckSentMessageIdsRef.current.add(message.id);
      }
    }
  }, [isWsConnected, selectedConversation, selectedMessages, sendAction, userId]);
}
