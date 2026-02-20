import { createProxyMiddleware } from "http-proxy-middleware";
import type { Express, NextFunction, Request, Response } from "express";
import { refreshAccessTokenIfNeeded } from "./auth";

type BffRequest = Request & {
  _accessToken?: string;
};

export function setupProxy(app: Express) {
  const userServiceTarget = process.env.USER_SERVICE_URL || "http://localhost:8082";
  const mediaServiceTarget = process.env.MEDIA_SERVICE_URL || "http://localhost:8083";
  const notificationServiceTarget = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8084";

  const injectAuthToken = async (req: Request, _res: Response, next: NextFunction) => {
    const request = req as BffRequest;
    const refreshedToken = await refreshAccessTokenIfNeeded(request);
    if (refreshedToken) {
      request._accessToken = refreshedToken;
    } else {
      const sessionToken = (request as any).session?.tokenSet?.access_token;
      if (sessionToken) {
        request._accessToken = sessionToken;
      }
    }
    next();
  };

  const applyProxyHeaders = (proxyReq: any, req: Request) => {
    const request = req as BffRequest;
    const token = request._accessToken ?? (request as any).session?.tokenSet?.access_token;
    if (token) {
      proxyReq.setHeader("Authorization", `Bearer ${token}`);
    }

    const claims = (request as any).session?.userinfo;
    const userId = claims?.sub;
    const username = claims?.preferred_username ?? claims?.name;
    const email = claims?.email;

    if (typeof userId === "string" && userId.length > 0) {
      proxyReq.setHeader("X-User-Id", userId);
    }
    if (typeof username === "string" && username.length > 0) {
      proxyReq.setHeader("X-User-Name", username);
    }
    if (typeof email === "string" && email.length > 0) {
      proxyReq.setHeader("X-User-Email", email);
    }
  };

  // New media routes kept
  app.use("/api/media/uploads", injectAuthToken);
  app.use("/api/media/uploads", createProxyMiddleware({
    target: mediaServiceTarget,
    changeOrigin: true,
    pathRewrite: {
      "^/api/media/uploads": "/uploads",
    },
    on: {
      proxyReq: applyProxyHeaders,
    },
  }));

  app.use("/api/media/downloads", injectAuthToken);
  app.use("/api/media/downloads", createProxyMiddleware({
    target: mediaServiceTarget,
    changeOrigin: true,
    pathRewrite: {
      "^/api/media/downloads": "/downloads",
    },
    on: {
      proxyReq: applyProxyHeaders,
    },
  }));

  // New notification inbox routes kept
  app.use("/api/notifications/me", injectAuthToken);
  app.use("/api/notifications/me", (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).session?.userinfo?.sub;
    if (!userId || typeof userId !== "string") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    next();
  });
  app.use("/api/notifications/me", createProxyMiddleware({
    target: notificationServiceTarget,
    changeOrigin: true,
    pathRewrite: (path, req: Request) => {
      const userId = encodeURIComponent((req as any).session?.userinfo?.sub as string);
      return path.replace(/^\/api\/notifications\/me/, `/api/notifications/users/${userId}`);
    },
    on: {
      proxyReq: applyProxyHeaders,
    },
  }));

  // Historical routes from bff-old restored
  const servicePatterns: Record<string, string> = {
    "/api/users/**": userServiceTarget,
    "/api/friends/**": userServiceTarget,
    "/api/projects/**": userServiceTarget,
    "/api/media/**": mediaServiceTarget,
  };

  for (const [pathPattern, target] of Object.entries(servicePatterns)) {
    const basePath = pathPattern.replace("/**", "");

    app.use(basePath, injectAuthToken);

    app.use(createProxyMiddleware({
      pathFilter: (pathname) => {
        if (pathPattern === "/api/media/**") {
          return pathname.startsWith("/api/media")
            && !pathname.startsWith("/api/media/uploads")
            && !pathname.startsWith("/api/media/downloads");
        }
        const wildcardPrefix = pathPattern.replace("/**", "");
        return pathname.startsWith(wildcardPrefix);
      },
      target,
      changeOrigin: true,
      on: {
        proxyReq: applyProxyHeaders,
      },
    }));
  }
}
