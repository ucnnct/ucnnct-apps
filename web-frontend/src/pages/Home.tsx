export default function Home() {



  return (
    <div style={{ maxWidth: 720, margin: "50px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Uconnect</h2>
        <button style={{ padding: "8px 12px", cursor: "pointer" }}>
          Déconnexion
        </button>
      </div>

      <h3>Profil</h3>
      <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        Eloka michel
      </pre>

      <h3>Chat (bientôt)</h3>
      <p>UI placeholfdeer  — on ajoutera rooms, messages, présence, WS, etc.</p>
    </div>
  );
}
