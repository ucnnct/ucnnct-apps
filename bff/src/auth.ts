import { Issuer, generators, Client, TokenSet } from "openid-client";
import type { Express, Request, Response, NextFunction } from "express";
import logger from "./logger";

let oidcClient: Client | undefined;
let isOidcReady = false;
let oidcValidationIssuerUri: string | undefined;

const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:5173/login/oauth2/code/keycloak";
const LOGOUT_REDIRECT_URI = process.env.LOGOUT_REDIRECT_URI || "http://localhost:5173/";

function rewriteBrowserEndpoint(
  endpoint: string | undefined,
  discoveredIssuerUri: string | undefined,
  externalIssuerUri: string
): string | undefined {
  if (!endpoint) return endpoint;

  if (discoveredIssuerUri && endpoint.startsWith(discoveredIssuerUri)) {
    return `${externalIssuerUri}${endpoint.slice(discoveredIssuerUri.length)}`;
  }

  try {
    const external = new URL(externalIssuerUri);
    const parsed = new URL(endpoint);
    parsed.protocol = external.protocol;
    parsed.host = external.host;
    return parsed.toString();
  } catch {
    return endpoint;
  }
}

function normalizeIssuerParam(
  callbackIssuer: string | undefined,
  externalIssuerUri: string
): string | undefined {
  if (!callbackIssuer) return callbackIssuer;

  try {
    const callback = new URL(callbackIssuer);
    const external = new URL(externalIssuerUri);
    const sameHost = callback.host === external.host;
    const samePath = callback.pathname === external.pathname;
    if (sameHost && samePath && callback.protocol !== external.protocol) {
      return externalIssuerUri;
    }
  } catch {
    // Keep original value if parsing fails.
  }

  return callbackIssuer;
}

export async function setupAuth(app: Express) {
  const internalIssuerUri = process.env.KEYCLOAK_ISSUER_URI || "http://keycloak:8080/realms/ucnnct";
  const externalIssuerUri = process.env.KEYCLOAK_EXTERNAL_URI || "http://localhost:8882/realms/ucnnct";

  const discoverIssuer = async () => {
    logger.info("[OIDC] Connecting to Keycloak: {}", internalIssuerUri);
    try {
      const discovered = await Issuer.discover(internalIssuerUri);
      const discoveredIssuerUri = discovered.metadata.issuer as string | undefined;
      // Keep token/id_token validation aligned with Keycloak's real issuer value.
      // Browser-facing redirects still use externalIssuerUri via rewritten endpoints.
      const validationIssuerUri = discoveredIssuerUri ?? externalIssuerUri;
      oidcValidationIssuerUri = validationIssuerUri;

      const browserAuthorizationEndpoint = rewriteBrowserEndpoint(
        discovered.metadata.authorization_endpoint,
        discoveredIssuerUri,
        externalIssuerUri
      );
      const browserEndSessionEndpoint = rewriteBrowserEndpoint(
        discovered.metadata.end_session_endpoint as string | undefined,
        discoveredIssuerUri,
        externalIssuerUri
      );

      const issuer = new Issuer({
        ...discovered.metadata,
        issuer: validationIssuerUri,
        authorization_endpoint: browserAuthorizationEndpoint,
        end_session_endpoint: browserEndSessionEndpoint,
      });

      oidcClient = new issuer.Client({
        client_id: "ucnnct-bff",
        client_secret: process.env.BFF_CLIENT_SECRET!,
        redirect_uris: [REDIRECT_URI],
        response_types: ["code"],
      });

      logger.info(
        "[OIDC] discovered issuer={} validation_issuer={} authorization_endpoint={}",
        discoveredIssuerUri ?? "n/a",
        validationIssuerUri,
        browserAuthorizationEndpoint ?? "n/a"
      );
      logger.info("[OIDC] redirect_uri = {}", REDIRECT_URI);
      isOidcReady = true;
      logger.info("[OIDC] Keycloak ready");
    } catch (err) {
      logger.warn("[OIDC] Keycloak unreachable, retrying in 5s...");
      setTimeout(discoverIssuer, 5000);
    }
  };

  discoverIssuer();

  const ensureOidcReady = (req: Request, res: Response, next: NextFunction) => {
    if (!isOidcReady || !oidcClient) {
      if (req.accepts("html")) {
        return res.status(503).send(`
          <html>
            <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;">
              <img src="/uconnect.svg" style="width:80px;margin-bottom:20px" onerror="this.style.display='none'">
              <div style="width:30px;height:30px;border:3px solid #f3f3f3;border-top:3px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;"></div>
              <h2 style="margin:20px 0 10px 0;">U-Connect is starting...</h2>
              <p style="color:#666;">Please wait while authentication is prepared.</p>
              <script>setTimeout(() => window.location.reload(), 3000);</script>
              <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </body>
          </html>
        `);
      }
      return res.status(503).json({ error: "Starting" });
    }
    next();
  };

  app.get("/bff/login", ensureOidcReady, (req, res) => {
    const nonce = generators.nonce();
    const state = generators.state();
    req.session.nonce = nonce;
    req.session.state = state;
    req.session.save(() => {
      const url = oidcClient!.authorizationUrl({ scope: "openid profile email", nonce, state });
      logger.debug("[OIDC] Login redirect initiated");
      res.redirect(url);
    });
  });

  app.all("/login/oauth2/code/keycloak", ensureOidcReady, async (req, res) => {
    try {
      if (req.method !== "GET" && req.method !== "POST") {
        logger.warn("[OIDC] Unsupported callback method {}", req.method);
        return res.status(405).send("Unsupported callback method");
      }

      const callbackInput = req.method === "GET" ? (req.originalUrl || req.url) : req;
      const params = oidcClient!.callbackParams(callbackInput as any) as Record<string, unknown>;
      const callbackIssuer = typeof params.iss === "string" ? params.iss : undefined;
      const normalizedIssuer = normalizeIssuerParam(
        callbackIssuer,
        oidcValidationIssuerUri ?? externalIssuerUri
      );
      if (callbackIssuer && normalizedIssuer && callbackIssuer !== normalizedIssuer) {
        logger.warn("[OIDC] Rewriting callback iss from {} to {}", callbackIssuer, normalizedIssuer);
        params.iss = normalizedIssuer;
      }

      if (!req.session.nonce || !req.session.state) {
        logger.warn("[OIDC] Session lost during callback (missing nonce/state)");
        return res.status(400).send("Session lost. Retry: <a href='/bff/login'>Login</a>");
      }

      const tokenSet = await oidcClient!.callback(REDIRECT_URI, params, {
        nonce: req.session.nonce,
        state: req.session.state,
      });

      req.session.tokenSet = tokenSet;
      req.session.userinfo = tokenSet.claims();
      delete (req.session as any).nonce;
      delete (req.session as any).state;
      logger.info("[OIDC] User authenticated sub={}", tokenSet.claims().sub);
      req.session.save(() => res.redirect("/"));
    } catch (err) {
      logger.error("[OIDC] Callback error", err as Error);
      res.status(500).send("Authentication error. <a href='/bff/login'>Retry</a>");
    }
  });

  app.get("/bff/userinfo", (req, res) => {
    if (!req.session.userinfo) return res.status(401).json({ error: "Not authenticated" });
    res.json(req.session.userinfo);
  });

  app.get("/bff/logout", ensureOidcReady, (req, res) => {
    const idToken = req.session.tokenSet?.id_token;
    const sub = req.session.userinfo?.sub;
    req.session.destroy(() => {
      logger.info("[OIDC] User logged out sub={}", sub ?? "unknown");
      if (idToken) {
        const logoutUrl = oidcClient!.endSessionUrl({
          id_token_hint: idToken,
          post_logout_redirect_uri: LOGOUT_REDIRECT_URI,
        });
        res.redirect(logoutUrl);
      } else {
        res.redirect("/");
      }
    });
  });
}

export async function refreshAccessTokenIfNeeded(req: Request): Promise<string | undefined> {
  if (!isOidcReady || !oidcClient || !req.session.tokenSet) return undefined;

  let tokenSet = new TokenSet(req.session.tokenSet);

  if (tokenSet.expired()) {
    try {
      tokenSet = await oidcClient.refresh(tokenSet);
      req.session.tokenSet = tokenSet;
      req.session.userinfo = tokenSet.claims();
      logger.debug("[OIDC] Token refreshed sub={}", tokenSet.claims().sub);
      return tokenSet.access_token;
    } catch (err) {
      logger.warn("[OIDC] Token refresh failed - user will need to re-authenticate");
      return undefined;
    }
  }

  return tokenSet.access_token;
}

export async function getUserInfoFromAccessToken(
  accessToken: string
): Promise<Record<string, unknown> | undefined> {
  if (!isOidcReady || !oidcClient || !accessToken) {
    return undefined;
  }

  try {
    const claims = await oidcClient.userinfo(accessToken);
    return claims && typeof claims === "object" ? (claims as Record<string, unknown>) : undefined;
  } catch (err) {
    logger.warn("[OIDC] Bearer token userinfo lookup failed");
    return undefined;
  }
}

export function getOidcStatus() {
  return isOidcReady ? "UP" : "STARTING";
}
