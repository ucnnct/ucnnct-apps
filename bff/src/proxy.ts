import { createProxyMiddleware } from "http-proxy-middleware";
import type { Express } from "express";
import { refreshAccessTokenIfNeeded } from "./auth";

// Redirige les appels API vers les bons microservices en ajoutant le token
export function setupProxy(app: Express) {
  const services: Record<string, string> = {
    "/api/users/**": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/friends/**": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/projects/**": process.env.USER_SERVICE_URL || "http://localhost:8082",
    "/api/media/**": process.env.MEDIA_SERVICE_URL || "http://localhost:8083",
  };

  for (const [path, target] of Object.entries(services)) {
    // Middleware qui récupère le token AVANT le proxy
    app.use(path.replace("/**", ""), async (req, _res, next) => {
      const token = await refreshAccessTokenIfNeeded(req as any);
      if (token) {
        (req as any)._accessToken = token;
      }
      next();
    });

    app.use(createProxyMiddleware({
      pathFilter: path,
      target,
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req) => {
          // Token déjà récupéré de façon synchrone
          const token = (req as any)._accessToken;
          if (token) {
            proxyReq.setHeader("Authorization", `Bearer ${token}`);
          }
        },
      },
    }));
  }
}
