import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface AuthUser {
  sub: string;
  email: string;
  fullName: string;
  preferredUsername: string;
  shortHandle: string;
  avatarUrl: string | null;
}

interface AuthState {
  initialized: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "login" | "logout">>({
    initialized: false, authenticated: false, user: null,
  });

  useEffect(() => {
    fetch("/bff/userinfo", { credentials: "include" })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((p) => {
        const username = p.preferred_username ?? "";
        const email = p.email ?? "";
        const cleanUsername = username.includes("@") ? "" : username;
        const shortHandle = cleanUsername || p.given_name || email.split("@")[0] || "user";
        setState({
          initialized: true, authenticated: true,
          user: { sub: p.sub ?? "", email, fullName: p.name ?? username, preferredUsername: username, shortHandle, avatarUrl: null },
        });
      })
      .catch(() => setState({ initialized: true, authenticated: false, user: null }));
  }, []);

  useEffect(() => {
    if (!state.authenticated) return;
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((me) => { if (me?.avatarUrl) setState((prev) => ({ ...prev, user: prev.user ? { ...prev.user, avatarUrl: me.avatarUrl } : null })); })
      .catch(() => {});
  }, [state.authenticated]);

  return (
    <AuthContext.Provider value={{
      ...state,
      login: () => { window.location.href = "/bff/login"; },
      logout: () => { window.location.href = "/bff/logout"; },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
