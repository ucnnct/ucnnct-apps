export const APP_WS_PATH = "/ws/uconnect";

export type AppSocketHandlers = {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (payload: string, event: MessageEvent) => void;
};

function resolveWsUrl(): string {
  const apiBaseUrl = window.__ENV__?.API_BASE_URL || "";
  const base = new URL(apiBaseUrl || window.location.origin, window.location.origin);
  const protocol = base.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${base.host}${APP_WS_PATH}`;
}

export function connectAppSocket(handlers: AppSocketHandlers = {}): WebSocket {
  const socket = new WebSocket(resolveWsUrl());

  if (handlers.onOpen) {
    socket.addEventListener("open", handlers.onOpen);
  }

  if (handlers.onClose) {
    socket.addEventListener("close", handlers.onClose);
  }

  if (handlers.onError) {
    socket.addEventListener("error", handlers.onError);
  }

  if (handlers.onMessage) {
    socket.addEventListener("message", (event) => {
      handlers.onMessage?.(String(event.data), event);
    });
  }

  return socket;
}
