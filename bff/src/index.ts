import express from "express";
import session from "express-session";
import pinoHttp from "pino-http";
import { setupAuth, getOidcStatus } from "./auth";
import { setupProxy } from "./proxy";
import { createServer } from "http";
import logger, { pinoInstance } from "./logger";
import { setupWsRelay } from "./wsRelay";

const app = express();

app.set("trust proxy", true);

app.use(pinoHttp({ logger: pinoInstance }));
app.use(express.urlencoded({ extended: false }));


const sessionMiddleware = session({
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
});

app.use(sessionMiddleware);

app.get("/actuator/health", (_req, res) => {
  const oidcStatus = getOidcStatus();
  res.status(oidcStatus === "UP" ? 200 : 503).json({ status: oidcStatus });
});

(async () => {
  setupAuth(app);
  setupProxy(app);
  const server = createServer(app);
  setupWsRelay(server, sessionMiddleware);
  server.listen(3001, () => logger.info("[BFF] Ready on port 3001"));
})();
