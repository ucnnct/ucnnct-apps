import { createProxyMiddleware } from "http-proxy-middleware";
import type { Express } from "express";

export function setupProxy(app: Express) {
  const services: Record<string, string> = {
    "/api/users": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/friends": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/projects": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/media": process.env.MEDIA_SERVICE_URL || "http://localhost:8083",
  };

  for (const [path, target] of Object.entries(services)) {
    app.use(path, createProxyMiddleware({
      target,
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req) => {
          const token = (req as any).session?.tokenSet?.access_token;
          if (token) proxyReq.setHeader("Authorization", `Bearer ${token}`);
        },
      },
    }));
  }
}
