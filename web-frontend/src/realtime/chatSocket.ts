export type ChatSocketHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
  onMessage?: (payload: string) => void;
};

function resolveWsUrl(): string {
  const apiBaseUrl = window.__ENV__?.API_BASE_URL || "";
  const base = new URL(apiBaseUrl || window.location.origin, window.location.origin);
  const protocol = base.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${base.host}/ws/chat`;
}

export function connectChatSocket(handlers: ChatSocketHandlers = {}): WebSocket {
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
      handlers.onMessage?.(String(event.data));
    });
  }

  return socket;
}
