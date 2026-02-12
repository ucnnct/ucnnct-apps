import express from "express";
import session from "express-session";
import { setupAuth, getOidcStatus } from "./auth";
import { setupProxy } from "./proxy";

const app = express();

// Indispensable pour gérer les cookies derrière un reverse-proxy (Traefik)
app.set("trust proxy", 1);

// Configuration de la session utilisateur
app.use(session({
  name: "uconnect.token.key",
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
