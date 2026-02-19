import { createProxyMiddleware } from "http-proxy-middleware";
import type { Express } from "express";

export function setupProxy(app: Express) {
  const userServiceTarget = process.env.USER_SERVICE_URL || "http://localhost:8082";
  const mediaServiceTarget = process.env.MEDIA_SERVICE_URL || "http://localhost:8083";
  const notificationServiceTarget = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8084";

  const withAuthAndUserContext = {
    on: {
      proxyReq: (proxyReq: any, req: any) => {
        const token = req.session?.tokenSet?.access_token;
        if (token) {
          proxyReq.setHeader("Authorization", `Bearer ${token}`);
        }

        const claims = req.session?.userinfo;
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
      },
    },
  };

  // New media flow: BFF routes -> MediaService /uploads/* and /downloads/*
  app.use("/api/media/uploads", createProxyMiddleware({
    target: mediaServiceTarget,
    changeOrigin: true,
    pathRewrite: {
      "^/api/media/uploads": "/uploads",
    },
    ...withAuthAndUserContext,
  }));

  app.use("/api/media/downloads", createProxyMiddleware({
    target: mediaServiceTarget,
    changeOrigin: true,
    pathRewrite: {
      "^/api/media/downloads": "/downloads",
    },
    ...withAuthAndUserContext,
  }));

  // Legacy media endpoints remain available (/api/media/upload, /api/media?key=...)
  app.use("/api/media", createProxyMiddleware({
    target: mediaServiceTarget,
    changeOrigin: true,
    ...withAuthAndUserContext,
  }));

  // Notification inbox via BFF:
  // - GET    /api/notifications/me?limit=&cursor=
  // - PATCH  /api/notifications/me/:notificationId/read
  // - PATCH  /api/notifications/me/read-all
  app.use("/api/notifications/me", (req: any, res: any, next: any) => {
    const userId = req.session?.userinfo?.sub;
    if (!userId || typeof userId !== "string") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    next();
  });

  app.use("/api/notifications/me", createProxyMiddleware({
    target: notificationServiceTarget,
    changeOrigin: true,
    pathRewrite: (path, req: any) => {
      const userId = encodeURIComponent(req.session?.userinfo?.sub as string);
      return path.replace(/^\/api\/notifications\/me/, `/api/notifications/users/${userId}`);
    },
    ...withAuthAndUserContext,
  }));

  const userServicePaths = ["/api/users", "/api/friends", "/api/projects"];
  for (const path of userServicePaths) {
    app.use(path, createProxyMiddleware({
      target: userServiceTarget,
      changeOrigin: true,
      ...withAuthAndUserContext,
    }));
  }
}
