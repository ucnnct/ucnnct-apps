import { create } from "zustand";
import { useWsStore } from "./wsStore";

export interface AuthUser {
  sub: string;
  email: string;
  fullName: string;
  preferredUsername: string;
  shortHandle: string;
  avatarUrl: string | null;
}

interface AuthStoreState {
  initialized: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  bootstrap: () => Promise<void>;
  login: () => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AUTH_RETRY_DELAY_MS = 2000;
let bootstrapPromise: Promise<void> | null = null;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  initialized: false,
  authenticated: false,
  user: null,

  bootstrap: async () => {
    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = (async () => {
      while (true) {
        try {
          const res = await fetch("/bff/userinfo", { credentials: "include" });
          if (res.status === 503) {
            await wait(AUTH_RETRY_DELAY_MS);
            continue;
          }
          if (!res.ok) {
            throw new Error("unauthorized");
          }

          const payload = await res.json();
          const username = payload.preferred_username ?? "";
          const email = payload.email ?? "";
          const cleanUsername = username.includes("@") ? "" : username;
          const shortHandle =
            cleanUsername || payload.given_name || email.split("@")[0] || "user";

          set({
            initialized: true,
            authenticated: true,
            user: {
              sub: payload.sub ?? "",
              email,
              fullName: payload.name ?? username,
              preferredUsername: username,
              shortHandle,
              avatarUrl: null,
            },
          });

          try {
            const profileRes = await fetch("/api/users/me", { credentials: "include" });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              if (profile?.avatarUrl) {
                get().updateUser({ avatarUrl: profile.avatarUrl });
              }
            }
          } catch {
            // Best-effort avatar hydration.
          }
          return;
        } catch {
          set({ initialized: true, authenticated: false, user: null });
          return;
        }
      }
    })().finally(() => {
      bootstrapPromise = null;
    });

    return bootstrapPromise;
  },

  login: () => {
    window.location.href = "/bff/login";
  },

  logout: () => {
    // Close websocket immediately so presence is cleared before logout redirect.
    useWsStore.getState().disconnect("logout");
    // Let the BFF terminate the server session first to avoid frontend redirect races.
    window.location.href = "/bff/logout";
  },

  updateUser: (patch) => {
    set((state) => {
      if (!state.user) {
        return {};
      }
      return { user: { ...state.user, ...patch } };
    });
  },
}));
