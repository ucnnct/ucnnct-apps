import { useEffect, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";

type Me = { username?: string; email?: string; sub?: string };

export default function Home() {
  const { keycloak } = useKeycloak();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = keycloak.token;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMe(await res.json());
    };
    run();
  }, [keycloak.token]);

  return (
    <div style={{ maxWidth: 720, margin: "50px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Intrachat</h2>
        <button onClick={() => keycloak.logout()} style={{ padding: "8px 12px", cursor: "pointer" }}>
          Déconnexion
        </button>
      </div>

      <h3>Profil</h3>
      <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        {JSON.stringify(me, null, 2)}
      </pre>

      <h3>Chat (bientôt)</h3>
      <p>UI placeholder — on ajoutera rooms, messages, présence, WS, etc.</p>
    </div>
  );
}
