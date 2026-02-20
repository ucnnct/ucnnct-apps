import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthProvider";
import { connectAppSocket } from "./appSocket";
import type { WsInboundActionType, WsOutboundActionType, WsPacket } from "./wsProtocol";

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10_000;

export const WS_ALL_ACTIONS = "*";

type WsConnectionStatus = "disconnected" | "connecting" | "connected";
type WsListener<TPayload = unknown> = (packet: WsPacket<TPayload>) => void;

interface AppSocketContextValue {
  status: WsConnectionStatus;
  connected: boolean;
  sendPacket: <TPayload = unknown>(packet: WsPacket<TPayload>) => boolean;
  sendAction: <TPayload = unknown>(
    actionType: WsInboundActionType,
    payload: TPayload,
  ) => boolean;
  subscribe: <TPayload = unknown>(
    actionType: WsOutboundActionType | typeof WS_ALL_ACTIONS,
    listener: WsListener<TPayload>,
  ) => () => void;
}

const AppSocketContext = createContext<AppSocketContextValue | null>(null);

function parsePacket(rawPayload: string): WsPacket<unknown> | null {
  try {
    const packet = JSON.parse(rawPayload) as WsPacket<unknown>;
    if (!packet || typeof packet !== "object" || typeof packet.type !== "string") {
      return null;
    }
    return packet;
  } catch {
    return null;
  }
}

export function AppSocketProvider({ children }: { children: ReactNode }) {
  const { initialized, authenticated } = useAuth();

  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<WsListener<unknown>>>>(new Map());
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const [status, setStatus] = useState<WsConnectionStatus>("disconnected");

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const notifyListeners = useCallback((packet: WsPacket<unknown>) => {
    const byType = listenersRef.current.get(packet.type);
    const wildcard = listenersRef.current.get(WS_ALL_ACTIONS);

    if (byType) {
      for (const listener of Array.from(byType)) {
        listener(packet);
      }
    }

    if (wildcard) {
      for (const listener of Array.from(wildcard)) {
        listener(packet);
      }
    }
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = initialized && authenticated;

    if (!initialized || !authenticated) {
      clearReconnectTimer();
      reconnectAttemptRef.current = 0;

      const socket = socketRef.current;
      socketRef.current = null;

      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close(1000, "auth_required");
      }

      setStatus("disconnected");
      return;
    }

    let disposed = false;

    const connect = () => {
      if (disposed || !shouldReconnectRef.current) {
        return;
      }

      const currentSocket = socketRef.current;
      if (
        currentSocket &&
        (currentSocket.readyState === WebSocket.OPEN || currentSocket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      setStatus("connecting");

      const socket = connectAppSocket({
        onOpen: () => {
          if (disposed) {
            return;
          }
          reconnectAttemptRef.current = 0;
          setStatus("connected");
        },
        onClose: (event) => {
          if (socketRef.current === socket) {
            socketRef.current = null;
          }
          if (disposed) {
            return;
          }
          setStatus("disconnected");

          if (event.code === 1008) {
            shouldReconnectRef.current = false;
            return;
          }

          const attempt = reconnectAttemptRef.current + 1;
          reconnectAttemptRef.current = attempt;
          const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1),
            RECONNECT_MAX_DELAY_MS,
          );

          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            connect();
          }, delay);
        },
        onError: () => {
          if (!disposed) {
            setStatus("disconnected");
          }
        },
        onMessage: (rawPayload) => {
          const packet = parsePacket(rawPayload);
          if (!packet) {
            return;
          }
          notifyListeners(packet);
        },
      });

      socketRef.current = socket;
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();

      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close(1000, "cleanup");
      }
    };
  }, [authenticated, clearReconnectTimer, initialized, notifyListeners]);

  const sendPacket = useCallback(<TPayload,>(packet: WsPacket<TPayload>): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(
      JSON.stringify({
        type: packet.type,
        payload: packet.payload ?? null,
        timestamp: packet.timestamp ?? Date.now(),
      }),
    );
    return true;
  }, []);

  const sendAction = useCallback(
    <TPayload,>(actionType: WsInboundActionType, payload: TPayload): boolean => {
      return sendPacket({ type: actionType, payload, timestamp: Date.now() });
    },
    [sendPacket],
  );

  const subscribe = useCallback(
    <TPayload,>(
      actionType: WsOutboundActionType | typeof WS_ALL_ACTIONS,
      listener: WsListener<TPayload>,
    ) => {
      const key = actionType;
      const listeners = listenersRef.current.get(key) ?? new Set<WsListener<unknown>>();
      listeners.add(listener as WsListener<unknown>);
      listenersRef.current.set(key, listeners);

      return () => {
        const currentListeners = listenersRef.current.get(key);
        if (!currentListeners) {
          return;
        }
        currentListeners.delete(listener as WsListener<unknown>);
        if (currentListeners.size === 0) {
          listenersRef.current.delete(key);
        }
      };
    },
    [],
  );

  const value = useMemo<AppSocketContextValue>(
    () => ({
      status,
      connected: status === "connected",
      sendPacket,
      sendAction,
      subscribe,
    }),
    [sendAction, sendPacket, status, subscribe],
  );

  return <AppSocketContext.Provider value={value}>{children}</AppSocketContext.Provider>;
}

export function useAppSocket(): AppSocketContextValue {
  const context = useContext(AppSocketContext);
  if (!context) {
    throw new Error("useAppSocket must be used inside AppSocketProvider");
  }
  return context;
}

export function useAppSocketAction<TPayload = unknown>(
  actionType: WsOutboundActionType | typeof WS_ALL_ACTIONS,
  listener: WsListener<TPayload>,
): void {
  const { subscribe } = useAppSocket();
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
