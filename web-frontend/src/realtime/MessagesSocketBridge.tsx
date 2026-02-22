import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useMessagesStore } from "../stores/messagesStore";
import { useAppSocket, useAppSocketAction, WS_ALL_ACTIONS } from "./AppSocketProvider";
import type {
  WsOutboundActionType,
  WsPacket,
  WsMessagePayload,
  WsTypingPayload,
} from "./wsProtocol";

const MESSAGE_DELIVERY_ACTION_TYPES = new Set<WsOutboundActionType>([
  "PRIVATE_MESSAGE",
  "GROUP_MESSAGE",
  "FILE_MESSAGE",
  "MESSAGE_SENT_ACK",
  "GROUP_MESSAGE_SENT_ACK",
  "FILE_MESSAGE_SENT_ACK",
]);

const ACK_CONFIRMATION_ACTION_TYPES = new Set<WsOutboundActionType>([
  "MESSAGE_RECEIVED_CONFIRMED",
  "GROUP_MESSAGE_RECEIVED_CONFIRMED",
  "MESSAGE_READ_CONFIRMED",
  "GROUP_MESSAGE_READ_CONFIRMED",
]);

const LIVE_INCOMING_MESSAGE_ACTION_TYPES = new Set<WsOutboundActionType>([
  "PRIVATE_MESSAGE",
  "GROUP_MESSAGE",
  "FILE_MESSAGE",
]);

function isWsMessagePayload(value: unknown): value is WsMessagePayload {
  return typeof value === "object" && value !== null;
}

function isWsTypingPayload(value: unknown): value is WsTypingPayload {
  return typeof value === "object" && value !== null;
}

export function MessagesSocketBridge() {
  const { authenticated, user } = useAuth();
  const { sendAction } = useAppSocket();

  const receivedAckSentRef = useRef<Set<string>>(new Set());

  const currentUserId = user?.sub ?? null;

  useEffect(() => {
    receivedAckSentRef.current.clear();
  }, [authenticated, currentUserId]);

  const canUseRealtimeAck = useMemo(
    () => authenticated && Boolean(currentUserId),
    [authenticated, currentUserId],
  );

  useAppSocketAction(WS_ALL_ACTIONS, (packet: WsPacket<unknown>) => {
    if (!canUseRealtimeAck || !currentUserId || !user) {
      return;
    }

    const actionType = packet.type as WsOutboundActionType;

    if (actionType === "USER_TYPING") {
      if (!isWsTypingPayload(packet.payload)) {
        return;
      }
      useMessagesStore.getState().ingestTypingUpdate(packet.payload, currentUserId);
      return;
    }

    if (
      !MESSAGE_DELIVERY_ACTION_TYPES.has(actionType) &&
      !ACK_CONFIRMATION_ACTION_TYPES.has(actionType)
    ) {
      return;
    }

    if (!isWsMessagePayload(packet.payload)) {
      return;
    }

    if (ACK_CONFIRMATION_ACTION_TYPES.has(actionType)) {
      useMessagesStore.getState().ingestWsMessageAck(packet.payload, actionType, currentUserId);
      return;
    }

    useMessagesStore.getState().ingestWsMessage(packet.payload, user);

    if (!LIVE_INCOMING_MESSAGE_ACTION_TYPES.has(actionType)) {
      return;
    }

    const senderId = packet.payload.senderId?.trim();
    const messageId = packet.payload.messageId?.trim();
    if (!senderId || !messageId || senderId === currentUserId) {
      return;
    }

    const ackPayload = {
      messageId,
      senderId,
      type: packet.payload.type,
      groupId: packet.payload.groupId,
    };

    if (!receivedAckSentRef.current.has(messageId)) {
      const receivedAckSent = sendAction("MESSAGE_RECEIVED", ackPayload);
      if (receivedAckSent) {
        receivedAckSentRef.current.add(messageId);
      }
    }
  });

  return null;
}
