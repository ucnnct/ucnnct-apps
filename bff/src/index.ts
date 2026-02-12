import express from "express";
import session from "express-session";
import { setupAuth, getOidcStatus } from "./auth";
import { setupProxy } from "./proxy";

const app = express();

// Trust the reverse-proxy chain (Cloudflare → nginx ingress → BFF)
// This ensures req.protocol returns "https" when X-Forwarded-Proto is set
app.set("trust proxy", true);

// Configuration de la session utilisateur
app.use(session({
  name: "uconnect.token.key",
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: "auto",
    sameSite: "lax",
    maxAge: 3600_000,
  },
}));

// Route de santé utilisée par Docker/Traefik
app.get("/actuator/health", (_req, res) => {
  const oidcStatus = getOidcStatus();
  res.status(oidcStatus === "UP" ? 200 : 503).json({ status: oidcStatus });
});

(async () => {
  setupAuth(app);
  setupProxy(app);
  app.listen(3001, () => console.log("[BFF] Prêt sur le port 3001"));
})();
