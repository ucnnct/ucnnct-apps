import { create } from "zustand";
import { connectAppSocket } from "../realtime/appSocket";
import type {
  WsInboundActionType,
  WsOutboundActionType,
  WsPacket,
} from "../realtime/wsProtocol";

export const WS_ALL_ACTIONS = "*";

type WsConnectionStatus = "disconnected" | "connecting" | "connected";
type WsActionSubscriptionKey = WsOutboundActionType | typeof WS_ALL_ACTIONS;
type WsListener<TPayload = unknown> = (packet: WsPacket<TPayload>) => void;

interface WsStoreState {
  status: WsConnectionStatus;
  connected: boolean;
  connect: () => void;
  disconnect: (reason?: string) => void;
  sendPacket: <TPayload = unknown>(packet: WsPacket<TPayload>) => boolean;
  sendAction: <TPayload = unknown>(
    actionType: WsInboundActionType,
    payload: TPayload,
  ) => boolean;
  subscribe: <TPayload = unknown>(
    actionType: WsActionSubscriptionKey,
    listener: WsListener<TPayload>,
  ) => () => void;
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10_000;
const listeners = new Map<string, Set<WsListener<unknown>>>();

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let reconnectAttempt = 0;
let shouldReconnect = false;

function clearReconnectTimer(): void {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

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

function notifyListeners(packet: WsPacket<unknown>): void {
  const typedListeners = listeners.get(packet.type);
  if (typedListeners) {
    for (const listener of Array.from(typedListeners)) {
      listener(packet);
    }
  }

  const wildcardListeners = listeners.get(WS_ALL_ACTIONS);
  if (wildcardListeners) {
    for (const listener of Array.from(wildcardListeners)) {
      listener(packet);
    }
  }
}

function scheduleReconnect(): void {
  if (!shouldReconnect) {
    return;
  }
  const attempt = reconnectAttempt + 1;
  reconnectAttempt = attempt;
  const delay = Math.min(
    RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1),
    RECONNECT_MAX_DELAY_MS,
  );

  clearReconnectTimer();
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    useWsStore.getState().connect();
  }, delay);
}

export const useWsStore = create<WsStoreState>((set, get) => ({
  status: "disconnected",
  connected: false,

  connect: () => {
    shouldReconnect = true;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    clearReconnectTimer();
    set({ status: "connecting", connected: false });

    const ws = connectAppSocket({
      onOpen: () => {
        reconnectAttempt = 0;
        set({ status: "connected", connected: true });
      },
      onClose: (event) => {
        if (socket === ws) {
          socket = null;
        }
        set({ status: "disconnected", connected: false });

        if (!shouldReconnect) {
          return;
        }

        if (event.code === 1008) {
          shouldReconnect = false;
          return;
        }
        scheduleReconnect();
      },
      onError: () => {
        set({ status: "disconnected", connected: false });
      },
      onMessage: (rawPayload) => {
        const packet = parsePacket(rawPayload);
        if (!packet) {
          return;
        }
        notifyListeners(packet);
      },
    });

    socket = ws;
  },

  disconnect: (reason = "manual_disconnect") => {
    shouldReconnect = false;
    reconnectAttempt = 0;
    clearReconnectTimer();

    const ws = socket;
    socket = null;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close(1000, reason);
    }

    set({ status: "disconnected", connected: false });
  },

  sendPacket: <TPayload,>(packet: WsPacket<TPayload>): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      socket.send(
        JSON.stringify({
          type: packet.type,
          payload: packet.payload ?? null,
          timestamp: packet.timestamp ?? Date.now(),
        }),
      );
      return true;
    } catch {
      return false;
    }
  },

  sendAction: <TPayload,>(actionType: WsInboundActionType, payload: TPayload): boolean => {
    return get().sendPacket({
      type: actionType,
      payload,
      timestamp: Date.now(),
    });
  },

  subscribe: <TPayload,>(
    actionType: WsActionSubscriptionKey,
    listener: WsListener<TPayload>,
  ) => {
    const key = actionType;
    const listenersForAction = listeners.get(key) ?? new Set<WsListener<unknown>>();
    listenersForAction.add(listener as WsListener<unknown>);
    listeners.set(key, listenersForAction);

    return () => {
      const currentListeners = listeners.get(key);
      if (!currentListeners) {
        return;
      }
      currentListeners.delete(listener as WsListener<unknown>);
      if (currentListeners.size === 0) {
        listeners.delete(key);
      }
    };
  },
}));
