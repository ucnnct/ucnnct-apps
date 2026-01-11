export default function Home() {
  const appEnv =
    (window as { __ENV__?: { APP_ENV?: string } }).__ENV__?.APP_ENV ?? "unknown";

  return (
    <div style={{ maxWidth: 720, margin: "50px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Uconnect</h2>
        <button style={{ padding: "8px 12px", cursor: "pointer" }}>
          Déconnexion
        </button>
      </div>

      <h3>Environment</h3>
      <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        {appEnv}
      </pre>

      <h3>Profil</h3>
      <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
       MiKeXpert Ops 1.15.0
      </pre>

      <h3>Chat (bientôt)</h3>
      <p>UI placeholfdveer  — on ajoutera rooms, messages, présence, WS, etc.</p>
    </div>
  );
}
