import type { IncomingMessage, Server as HttpServer } from "http";
import type { RequestHandler } from "express";
import type { Session, SessionData } from "express-session";
import type { Duplex } from "stream";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import logger from "./logger";

type SessionRequest = IncomingMessage & {
  session?: Session & Partial<SessionData>;
};

const CLIENT_WS_PATH = process.env.WS_CLIENT_PATH || "/ws/chat";
const WS_MANAGER_URL = process.env.WS_MANAGER_URL || "ws://ws-manager:8080/ws/chat";
const MAX_PAYLOAD_BYTES = Number(process.env.WS_MAX_PAYLOAD_BYTES || 262144);
const MAX_BUFFERED_MESSAGES = Number(process.env.WS_MAX_BUFFERED_MESSAGES || 100);

const allowedOrigins = new Set(
  (process.env.WS_ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function toHttpStatus(status: number, message: string): Buffer {
  return Buffer.from(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (allowedOrigins.size === 0 || allowedOrigins.has("*")) {
    return true;
  }
  return !!origin && allowedOrigins.has(origin);
}

function parseSession(req: SessionRequest, sessionMiddleware: RequestHandler): Promise<void> {
  return new Promise((resolve, reject) => {
    sessionMiddleware(req as never, {} as never, (err?: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function resolveUserId(req: SessionRequest): string | undefined {
  const claims = req.session?.userinfo;
  if (!claims || typeof claims !== "object") {
    return undefined;
  }
  const sub = (claims as Record<string, unknown>).sub;
  return typeof sub === "string" && sub.trim() ? sub : undefined;
}

function closeWithStatus(socket: Duplex, status: number, message: string): void {
  socket.write(toHttpStatus(status, message));
  socket.destroy();
}

function normalizeCloseCode(code: number): number {
  const disallowed = new Set([1005, 1006, 1015]);
  if (code >= 1000 && code <= 4999 && !disallowed.has(code)) {
    return code;
  }
  return 1011;
}

function forward(
  downstream: WebSocket,
  upstream: WebSocket,
  connectionId: string,
  userId: string,
): void {
  const queued: Array<{ data: RawData; isBinary: boolean }> = [];

  downstream.on("message", (data, isBinary) => {
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(data, { binary: isBinary });
      return;
    }

    if (upstream.readyState === WebSocket.CONNECTING && queued.length < MAX_BUFFERED_MESSAGES) {
      queued.push({ data, isBinary });
    }
  });

  upstream.on("open", () => {
    logger.info("[WS] Upstream connected id={} userId={}", connectionId, userId);
    for (const item of queued) {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(item.data, { binary: item.isBinary });
      }
    }
    queued.length = 0;
  });

  upstream.on("message", (data, isBinary) => {
    if (downstream.readyState === WebSocket.OPEN) {
      downstream.send(data, { binary: isBinary });
    }
  });

  upstream.on("close", (code, reason) => {
    const text = reason.toString();
    logger.info("[WS] Upstream closed id={} userId={} code={} reason={}", connectionId, userId, code, text || "none");
    if (downstream.readyState === WebSocket.OPEN || downstream.readyState === WebSocket.CONNECTING) {
      downstream.close(normalizeCloseCode(code), text || "upstream_closed");
    }
  });

  upstream.on("error", (err) => {
    logger.error("[WS] Upstream error id={} userId={} err={}", connectionId, userId, err.message);
    if (downstream.readyState === WebSocket.OPEN || downstream.readyState === WebSocket.CONNECTING) {
      downstream.close(1011, "upstream_error");
    }
  });

  downstream.on("close", (code, reason) => {
    const text = reason.toString();
    logger.info("[WS] Client closed id={} userId={} code={} reason={}", connectionId, userId, code, text || "none");
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close(normalizeCloseCode(code), text || "client_closed");
    }
  });

  downstream.on("error", (err) => {
    logger.warn("[WS] Client error id={} userId={} err={}", connectionId, userId, err.message);
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close(1011, "client_error");
    }
  });
}

export function setupWsRelay(server: HttpServer, sessionMiddleware: RequestHandler): void {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_PAYLOAD_BYTES,
  });

  let sequence = 0;

  wss.on("connection", (downstream, req) => {
    const sessionReq = req as SessionRequest;
    const userId = resolveUserId(sessionReq);
    if (!userId) {
      downstream.close(1008, "unauthorized");
      return;
    }

    const connectionId = `${Date.now()}-${++sequence}`;
    const upstreamUrl = new URL(WS_MANAGER_URL);
    upstreamUrl.searchParams.set("userId", userId);

    const accessToken = sessionReq.session?.tokenSet?.access_token;
    const upstreamHeaders: Record<string, string> = { "X-User-Id": userId };
    if (typeof accessToken === "string" && accessToken) {
      upstreamHeaders.Authorization = `Bearer ${accessToken}`;
    }

    logger.info("[WS] Client connected id={} userId={} path={}", connectionId, userId, CLIENT_WS_PATH);
    const upstream = new WebSocket(upstreamUrl, { headers: upstreamHeaders });
    forward(downstream, upstream, connectionId, userId);
  });

  server.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname !== CLIENT_WS_PATH) {
      return;
    }

    if (!isAllowedOrigin(req.headers.origin)) {
      logger.warn("[WS] Rejected origin path={} origin={}", url.pathname, req.headers.origin || "missing");
      closeWithStatus(socket, 403, "Forbidden");
      return;
    }

    const sessionReq = req as SessionRequest;
    try {
      await parseSession(sessionReq, sessionMiddleware);
    } catch (err) {
      logger.error("[WS] Session parsing failed err={}", (err as Error).message);
      closeWithStatus(socket, 500, "Internal Server Error");
      return;
    }

    if (!resolveUserId(sessionReq)) {
      closeWithStatus(socket, 401, "Unauthorized");
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, sessionReq);
    });
  });
}
