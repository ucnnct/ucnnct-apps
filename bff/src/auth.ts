import { Issuer, generators, type Client, TokenSet } from "openid-client";
import type { Express, Request } from "express";

let oidcClient: Client | undefined;

export async function setupAuth(app: Express) {
  const internalIssuerUri = process.env.KEYCLOAK_ISSUER_URI || "http://localhost:8081/realms/ucnnct";
  const externalIssuerUri = process.env.KEYCLOAK_EXTERNAL_URI || "http://localhost:8081/realms/ucnnct";

  // Decouverte OIDC via l'URL interne du cluster (server-to-server)
  const discovered = await Issuer.discover(internalIssuerUri);

  // Remplace les endpoints navigateur par l'URL externe (localhost:8081)
  const issuer = new Issuer({
    ...discovered.metadata,
    issuer: externalIssuerUri,
    authorization_endpoint: discovered.metadata.authorization_endpoint?.replace(internalIssuerUri, externalIssuerUri),
    token_endpoint: discovered.metadata.token_endpoint,
    end_session_endpoint: (discovered.metadata.end_session_endpoint as string | undefined)?.replace(internalIssuerUri, externalIssuerUri),
  });

  const client = new issuer.Client({
    client_id: "ucnnct-bff",
    client_secret: process.env.BFF_CLIENT_SECRET!,
    redirect_uris: [process.env.REDIRECT_URI || "http://localhost/login/oauth2/code/keycloak"],
    response_types: ["code"],
  });
  oidcClient = client;

  // Login — redirige le navigateur vers Keycloak
  app.get("/bff/login", (req, res) => {
    const nonce = generators.nonce();
    const state = generators.state();
    req.session.nonce = nonce;
    req.session.state = state;
    req.session.save(() => {
      const url = client.authorizationUrl({ scope: "openid profile email", nonce, state });
      res.redirect(url);
    });
  });

  // Callback Keycloak — echange le code d'autorisation contre les tokens
  app.get("/login/oauth2/code/keycloak", async (req, res) => {
    try {
      const params = client.callbackParams(req);
      const tokenSet = await client.callback(
        process.env.REDIRECT_URI || "http://localhost/login/oauth2/code/keycloak",
        params,
        { nonce: req.session.nonce, state: req.session.state }
      );
      req.session.tokenSet = tokenSet;
      req.session.userinfo = tokenSet.claims();
      res.redirect("/");
    } catch (err) {
      console.error("Callback error:", err);
      res.redirect("/bff/login");
    }
  });

  // Userinfo — retourne les infos utilisateur depuis la session
  app.get("/bff/userinfo", (req, res) => {
    if (!req.session.userinfo) return res.status(401).json({ error: "Not authenticated" });
    res.json(req.session.userinfo);
  });

  // Logout — detruit la session et deconnecte de Keycloak
  app.get("/bff/logout", (req, res) => {
    const idToken = req.session.tokenSet?.id_token;
    req.session.destroy(() => {
      if (idToken) {
        const logoutUrl = client.endSessionUrl({ id_token_hint: idToken, post_logout_redirect_uri: "http://localhost/" });
        res.redirect(logoutUrl);
      } else {
        res.redirect("/");
      }
    });
  });
}

export async function refreshAccessTokenIfNeeded(req: Request): Promise<string | undefined> {
  if (!oidcClient) {
    return req.session?.tokenSet?.access_token;
  }
  if (!req.session?.tokenSet) {
    return undefined;
  }

  let tokenSet = new TokenSet(req.session.tokenSet);
  if (tokenSet.expired()) {
    try {
      tokenSet = await oidcClient.refresh(tokenSet);
      req.session.tokenSet = tokenSet;
      req.session.userinfo = tokenSet.claims();
      return tokenSet.access_token;
    } catch {
      return undefined;
    }
  }
  return tokenSet.access_token;
}
