import express from "express";
import session from "express-session";
import { setupAuth } from "./auth";
import { setupProxy } from "./proxy";

const app = express();

// Fait confiance au reverse proxy (Traefik / Ingress) pour les cookies de session
app.set("trust proxy", 1);

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

app.get("/actuator/health", (_req, res) => res.json({ status: "UP" }));

(async () => {
  await setupAuth(app);
  setupProxy(app);
  app.listen(3001, () => console.log("BFF listening on :3001"));
})();
