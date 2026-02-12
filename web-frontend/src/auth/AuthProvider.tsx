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
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "login" | "logout" | "updateUser">>({
    initialized: false, 
    authenticated: false, 
    user: null,
  });

  useEffect(() => {
    const checkAuth = () => {
      fetch("/bff/userinfo", { credentials: "include" })
        .then((res) => {
          if (res.status === 503) {
            // Le serveur démarre, on réessaie dans 2s sans bloquer l'interface
            setTimeout(checkAuth, 2000);
            return null;
          }
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((p) => {
          if (!p) return;
          const username = p.preferred_username ?? "";
          const email = p.email ?? "";
          const cleanUsername = username.includes("@") ? "" : username;
          const shortHandle = cleanUsername || p.given_name || email.split("@")[0] || "user";
          
          setState({
            initialized: true, authenticated: true,
            user: { sub: p.sub ?? "", email, fullName: p.name ?? username, preferredUsername: username, shortHandle, avatarUrl: null },
          });
          // Charge l'avatar depuis le profil utilisateur
          fetch("/api/users/me", { credentials: "include" })
            .then((r) => r.ok ? r.json() : null)
            .then((profile) => {
              if (profile?.avatarUrl) {
                setState((prev) => prev.user ? { ...prev, user: { ...prev.user, avatarUrl: profile.avatarUrl } } : prev);
              }
            })
            .catch(() => {});
        })
        .catch(() => setState({ initialized: true, authenticated: false, user: null }));
    };

    checkAuth();
  }, []);

  if (!state.initialized) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#fff'
      }}>
        <img src="/uconnect.svg" alt="U-Connect" style={{ width: '80px', marginBottom: '24px' }} 
             onError={(e) => e.currentTarget.style.display = 'none'} />
        <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#1a1a1a', fontWeight: 'bold' }}>U-Connect</h1>
        <p style={{ fontSize: '1.1rem', color: '#666', margin: 0 }}>Un petit instant, on arrive !</p>
        <div style={{ marginTop: '30px', width: '40px', height: '2px', backgroundColor: '#eee', position: 'relative', overflow: 'hidden' }}>
          <div className="bar" />
        </div>
        <style>{`.bar { width: 20px; height: 100%; backgroundColor: #000; position: absolute; animation: slide 1.5s infinite ease-in-out; } @keyframes slide { 0% { left: -20px; } 100% { left: 40px; } }`}</style>
      </div>
    );
  }

  const updateUser = (patch: Partial<AuthUser>) => {
    setState((prev) => prev.user ? { ...prev, user: { ...prev.user, ...patch } } : prev);
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login: () => { window.location.href = "/bff/login"; },
      logout: () => { window.location.href = "/bff/logout"; },
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
