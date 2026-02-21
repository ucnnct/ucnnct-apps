/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { WS_ALL_ACTIONS, useWsStore } from "../stores/wsStore";
import type { WsOutboundActionType, WsPacket } from "./wsProtocol";
import { useShallow } from "zustand/react/shallow";

type WsListener<TPayload = unknown> = (packet: WsPacket<TPayload>) => void;

export { WS_ALL_ACTIONS };

export function AppSocketProvider({ children }: { children: ReactNode }) {
  const { initialized, authenticated } = useAuth();
  const connect = useWsStore((state) => state.connect);
  const disconnect = useWsStore((state) => state.disconnect);

  useEffect(() => {
    if (!initialized || !authenticated) {
      disconnect("auth_required");
      return;
    }

    connect();

    return () => {
      disconnect("cleanup");
    };
  }, [authenticated, connect, disconnect, initialized]);

  return children;
}

export function useAppSocket() {
  return useWsStore(
    useShallow((state) => ({
      status: state.status,
      connected: state.connected,
      sendPacket: state.sendPacket,
      sendAction: state.sendAction,
      subscribe: state.subscribe,
    })),
  );
}

export function useAppSocketAction<TPayload = unknown>(
  actionType: WsOutboundActionType | typeof WS_ALL_ACTIONS,
  listener: WsListener<TPayload>,
): void {
  const subscribe = useWsStore((state) => state.subscribe);
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(() => {
    return subscribe<TPayload>(actionType, (packet) => {
      listenerRef.current(packet);
    });
  }, [actionType, subscribe]);
}
