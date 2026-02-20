/* eslint-disable react-refresh/only-export-components */
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthStore, type AuthUser } from "../stores/authStore";
import { useShallow } from "zustand/react/shallow";

export type { AuthUser };

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((state) => state.initialized);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!initialized) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "sans-serif",
          backgroundColor: "#fff",
        }}
      >
        <img
          src="/uconnect.svg"
          alt="U-Connect"
          style={{ width: "80px", marginBottom: "24px" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <h1
          style={{
            fontSize: "2rem",
            margin: "0 0 8px 0",
            color: "#1a1a1a",
            fontWeight: "bold",
          }}
        >
          U-Connect
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#666", margin: 0 }}>
          Un petit instant, on arrive !
        </p>
        <div
          style={{
            marginTop: "30px",
            width: "40px",
            height: "2px",
            backgroundColor: "#eee",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div className="bar" />
        </div>
        <style>{`.bar { width: 20px; height: 100%; backgroundColor: #000; position: absolute; animation: slide 1.5s infinite ease-in-out; } @keyframes slide { 0% { left: -20px; } 100% { left: 40px; } }`}</style>
      </div>
    );
  }

  return children;
}

export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      initialized: state.initialized,
      authenticated: state.authenticated,
      user: state.user,
      login: state.login,
      logout: state.logout,
      updateUser: state.updateUser,
    })),
  );
}
