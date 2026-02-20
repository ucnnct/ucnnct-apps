import { createProxyMiddleware } from "http-proxy-middleware";
import type { Express } from "express";
import { refreshAccessTokenIfNeeded } from "./auth";
import logger from "./logger";

export function setupProxy(app: Express) {
  const services: Record<string, string> = {
    "/api/users/**": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/friends/**": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/projects/**": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/media/**": process.env.MEDIA_SERVICE_URL || "http://localhost:8083",
    // "/api/groups/**": process.env.GROUP_SERVICE_URL || "http://localhost:8085",
    // "/api/chat/**": process.env.CHAT_SERVICE_URL || "http://localhost:8084",
  };

  for (const [path, target] of Object.entries(services)) {
    app.use(path.replace("/**", ""), async (req, _res, next) => {
      const token = await refreshAccessTokenIfNeeded(req as any);
      if (token) {
        (req as any)._accessToken = token;
        logger.debug("[PROXY] Token injected for {} {}", req.method, req.path);
      } else {
        logger.debug("[PROXY] No token available for {} {}", req.method, req.path);
      }
      next();
    });

    app.use(createProxyMiddleware({
      pathFilter: path,
      target,
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req) => {
          const token = (req as any)._accessToken;
          if (token) {
            proxyReq.setHeader("Authorization", `Bearer ${token}`);
          }
        },
        error: (err, req, res) => {
          logger.error("[PROXY] Request failed {} {} -> {}: {}", (req as any).method, (req as any).path, target, (err as Error).message);
          if (typeof (res as any).status === "function") {
            (res as any).status(502).json({ error: "Service unavailable" });
          }
        },
      },
    }));
  }
}
