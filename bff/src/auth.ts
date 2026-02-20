import { Issuer, generators, Client, TokenSet } from "openid-client";
import type { Express, Request, Response, NextFunction } from "express";
import logger from "./logger";

let oidcClient: Client | undefined;
let isOidcReady = false;

const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:5173/login/oauth2/code/keycloak";
const LOGOUT_REDIRECT_URI = process.env.LOGOUT_REDIRECT_URI || "http://localhost:5173/";

export async function setupAuth(app: Express) {
  const internalIssuerUri = process.env.KEYCLOAK_ISSUER_URI || "http://keycloak:8080/realms/ucnnct";
  const externalIssuerUri = process.env.KEYCLOAK_EXTERNAL_URI || "http://localhost:8882/realms/ucnnct";

  const discoverIssuer = async () => {
    logger.info("[OIDC] Connecting to Keycloak: {}", internalIssuerUri);
    try {
      const discovered = await Issuer.discover(internalIssuerUri);

      const issuer = new Issuer({
        ...discovered.metadata,
        issuer: externalIssuerUri,
        authorization_endpoint: discovered.metadata.authorization_endpoint?.replace(internalIssuerUri, externalIssuerUri),
        end_session_endpoint: (discovered.metadata.end_session_endpoint as string | undefined)?.replace(internalIssuerUri, externalIssuerUri),
      });

      oidcClient = new issuer.Client({
        client_id: "ucnnct-bff",
        client_secret: process.env.BFF_CLIENT_SECRET!,
        redirect_uris: [REDIRECT_URI],
        response_types: ["code"],
      });

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
      if (req.accepts('html')) {
        return res.status(503).send(`
          <html>
            <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;">
              <img src="/uconnect.svg" style="width:80px;margin-bottom:20px" onerror="this.style.display='none'">
              <div style="width:30px;height:30px;border:3px solid #f3f3f3;border-top:3px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;"></div>
              <h2 style="margin:20px 0 10px 0;">U-Connect arrive...</h2>
              <p style="color:#666;">Un petit instant, on prépare votre accès.</p>
              <script>setTimeout(() => window.location.reload(), 3000);</script>
              <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </body>
          </html>
        `);
      }
      return res.status(503).json({ error: "En cours de démarrage" });
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

  app.get("/login/oauth2/code/keycloak", ensureOidcReady, async (req, res) => {
    try {
      const params = oidcClient!.callbackParams(req);

      // session perdue : on affiche une erreur plutôt que de rediriger en boucle
      if (!req.session.nonce || !req.session.state) {
        logger.warn("[OIDC] Session lost during callback (missing nonce/state) — check cookie secure/sameSite config");
        return res.status(400).send("Session perdue. Veuillez réessayer : <a href='/bff/login'>Se connecter</a>");
      }

      const tokenSet = await oidcClient!.callback(
        REDIRECT_URI,
        params,
        { nonce: req.session.nonce, state: req.session.state }
      );
      req.session.tokenSet = tokenSet;
      req.session.userinfo = tokenSet.claims();
      delete (req.session as any).nonce;
      delete (req.session as any).state;
      logger.info("[OIDC] User authenticated sub={}", tokenSet.claims().sub);
      req.session.save(() => res.redirect("/"));
    } catch (err) {
      logger.error("[OIDC] Callback error", err as Error);
      // pas de redirect vers /bff/login pour éviter une boucle infinie
      res.status(500).send("Erreur d'authentification. <a href='/bff/login'>Réessayer</a>");
    }
  });

  app.get("/bff/userinfo", (req, res) => {
    if (!req.session.userinfo) return res.status(401).json({ error: "Non connecté" });
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
          post_logout_redirect_uri: LOGOUT_REDIRECT_URI
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
      logger.warn("[OIDC] Token refresh failed — user will need to re-authenticate");
      return undefined;
    }
  }

  return tokenSet.access_token;
}

export function getOidcStatus() {
  return isOidcReady ? "UP" : "STARTING";
}
