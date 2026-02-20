import { useAuth } from "../auth/AuthProvider";
import { useMessagesStore } from "../stores/messagesStore";
import { useAppSocketAction, WS_ALL_ACTIONS } from "./AppSocketProvider";
import type { WsOutboundActionType, WsPacket, WsMessagePayload } from "./wsProtocol";

const MESSAGE_ACTION_TYPES = new Set<WsOutboundActionType>([
  "PRIVATE_MESSAGE",
  "GROUP_MESSAGE",
  "FILE_MESSAGE",
  "MESSAGE_SENT_ACK",
  "GROUP_MESSAGE_SENT_ACK",
  "FILE_MESSAGE_SENT_ACK",
]);

function isWsMessagePayload(value: unknown): value is WsMessagePayload {
  return typeof value === "object" && value !== null;
}

export function MessagesSocketBridge() {
  const { authenticated, user } = useAuth();

  useAppSocketAction(WS_ALL_ACTIONS, (packet: WsPacket<unknown>) => {
    if (!authenticated || !user) {
      return;
    }
    if (!MESSAGE_ACTION_TYPES.has(packet.type as WsOutboundActionType)) {
      return;
    }
    if (!isWsMessagePayload(packet.payload)) {
      return;
    }

    useMessagesStore.getState().ingestWsMessage(packet.payload, user);
  });

  return null;
}
