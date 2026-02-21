import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useMessagesStore } from "../stores/messagesStore";
import { useAppSocket, useAppSocketAction } from "./AppSocketProvider";
import type {
  WsPacket,
  WsPresenceUpdatePayload,
} from "./wsProtocol";

function isPresenceUpdatePayload(value: unknown): value is WsPresenceUpdatePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as WsPresenceUpdatePayload;
  return typeof payload.userId === "string" && typeof payload.online === "boolean";
}

export function PresenceSocketBridge() {
  const { authenticated } = useAuth();
  const { connected, sendAction } = useAppSocket();
  const activeUserId = useMessagesStore((state) => state.activeUserId);
  const conversations = useMessagesStore((state) => state.conversations);

  const lastSubscriptionSignatureRef = useRef("");

  const peerUserIds = useMemo(() => {
    const uniqueIds = new Set<string>();
    for (const conversation of conversations) {
      if (conversation.kind === "peer" && conversation.peerUserId) {
        if (conversation.peerUserId !== activeUserId) {
          uniqueIds.add(conversation.peerUserId);
        }
        continue;
      }

      if (conversation.kind === "group") {
        for (const participantId of conversation.participantIds) {
          if (!participantId || participantId === activeUserId) {
            continue;
          }
          uniqueIds.add(participantId);
        }
      }
    }
    return Array.from(uniqueIds).sort();
  }, [activeUserId, conversations]);

  useEffect(() => {
    if (!authenticated || !connected || !activeUserId) {
      return;
    }

    const signature = peerUserIds.join(",");
    if (signature === lastSubscriptionSignatureRef.current) {
      return;
    }

    lastSubscriptionSignatureRef.current = signature;
    sendAction("PRESENCE_SUBSCRIBE", { userIds: peerUserIds });
  }, [activeUserId, authenticated, connected, peerUserIds, sendAction]);

  useEffect(() => {
    if (!authenticated || !connected) {
      lastSubscriptionSignatureRef.current = "";
    }
  }, [authenticated, connected]);

  useAppSocketAction("PRESENCE_UPDATE", (packet: WsPacket<unknown>) => {
    if (!authenticated) {
      return;
    }
    if (!isPresenceUpdatePayload(packet.payload)) {
      return;
    }
    useMessagesStore.getState().ingestPresenceUpdate(packet.payload);
  });

  return null;
}
