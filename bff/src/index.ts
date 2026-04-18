import express from "express";
import session from "express-session";
import RedisStore from "connect-redis";
import Redis from "ioredis";
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

function createSessionStore(): session.Store | undefined {
  const mode = (process.env.BFF_SESSION_STORE ?? (process.env.REDIS_HOST ? "redis" : "memory")).toLowerCase();
  if (mode !== "redis") {
    pinoInstance.info({ mode }, "[BFF] Using in-memory session store");
    return undefined;
  }

  const redisHost = process.env.REDIS_HOST ?? "127.0.0.1";
  const redisPort = Number(process.env.REDIS_PORT ?? "6379");
  const redisDb = Number(process.env.BFF_SESSION_REDIS_DB ?? "0");
  const redisTls = /^true$/i.test(process.env.BFF_SESSION_REDIS_TLS ?? "");
  const redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    db: redisDb,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...(redisTls ? { tls: {} } : {})
  });

  redisClient.on("connect", () => {
    pinoInstance.info(
      { host: redisHost, port: redisPort, db: redisDb, tls: redisTls },
      "[BFF] Redis session store connected"
    );
  });
  redisClient.on("error", (error) => {
    pinoInstance.error({ err: error }, "[BFF] Redis session store error");
  });

  return new RedisStore({
    client: redisClient,
    prefix: process.env.BFF_SESSION_PREFIX ?? "bff:sess:"
  });
}

const sessionMiddleware = session({
  name: "uconnect.token.key",
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  store: createSessionStore(),
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
