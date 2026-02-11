import "express-session";
import type { TokenSet } from "openid-client";

declare module "express-session" {
  interface SessionData {
    nonce: string;
    state: string;
    tokenSet: TokenSet;
    userinfo: Record<string, unknown>;
  }
}
