import { useEffect, useState } from "react";
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from "react-oidc-context";
import { oidcConfig } from "./keycloak";
import type { ReactNode } from "react";
import { userApi } from "../api/users";

export interface AuthUser {
  sub: string;
  email: string;
  fullName: string;
  preferredUsername: string;
  shortHandle: string;
  avatarUrl: string | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <OidcAuthProvider {...oidcConfig}>{children}</OidcAuthProvider>;
}

export function useAuth() {
  const auth = useOidcAuth();

  useEffect(() => {
    return auth.events.addAccessTokenExpiring(() => {
      auth.signinSilent().catch((err) => {
        console.warn("Silent renew failed", err);
      });
    });
  }, [auth.events, auth.signinSilent]);

  const profile = auth.user?.profile;
  const accessToken = auth.user?.access_token;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !accessToken) return;
    userApi.getMe(accessToken).then((me) => {
      setAvatarUrl(me.avatarUrl ?? null);
    }).catch(() => {});
  }, [auth.isAuthenticated, accessToken]);

  const username = (profile?.preferred_username as string) ?? "";
  const email = (profile?.email as string) ?? "";
  const firstName = (profile?.given_name as string) ?? "";
  const cleanUsername = username.includes("@") ? "" : username;
  const shortHandle = cleanUsername
    || firstName
    || email.split("@")[0]
    || "user";

  const user: AuthUser | null = auth.isAuthenticated && profile
    ? {
        sub: profile.sub ?? "",
        email,
        fullName: (profile.name as string) ?? username ?? "",
        preferredUsername: username,
        shortHandle,
        avatarUrl,
      }
    : null;

  return {
    initialized: !auth.isLoading,
    authenticated: auth.isAuthenticated,
    user,
    token: accessToken,
    login: () => auth.signinRedirect(),
    logout: () => auth.signoutRedirect(),
  };
}
