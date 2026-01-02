import { useKeycloak } from "@react-keycloak/web";

export default function Login() {
  const { keycloak } = useKeycloak();

  const handleKeycloakLogin = () => {
    void keycloak.login();
  };

  const handleGoogleLogin = () => {
    void keycloak.login({ idpHint: "google" });
  };

  return (
    <div className="auth-page">
      <div className="auth-orbit" aria-hidden="true" />
      <main className="auth-shell">
        <section className="auth-info">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              IC
            </div>
            <div className="brand-copy">
              <span className="brand-name">Intrachat</span>
              <span className="brand-tagline">Messagerie d entreprise pour equipes modernes</span>
            </div>
          </div>

          <h1>Authentification simple pour equipes exigeantes</h1>
          <p className="auth-lead">
            Accedez a vos espaces de travail via Keycloak ou Google Workspace. Les acces
            sont centralises, audites et gerees par votre organisation.
          </p>

          <div className="auth-highlights">
            <div className="auth-highlight">
              <span className="highlight-title">SSO pilote</span>
              <span className="highlight-text">
                Roles, MFA et politiques d acces gouvernees dans Keycloak.
              </span>
            </div>
            <div className="auth-highlight">
              <span className="highlight-title">Conformite et audit</span>
              <span className="highlight-text">
                Journalisation claire pour une trace simple des acces.
              </span>
            </div>
            <div className="auth-highlight">
              <span className="highlight-title">Connexion rapide</span>
              <span className="highlight-text">
                Reprise de session fluide sans interrompre les equipes.
              </span>
            </div>
          </div>

          <div className="auth-badges">
            <span>Chiffrement</span>
            <span>Conformite</span>
            <span>Journalisation</span>
          </div>
        </section>

        <section className="auth-card" aria-label="Connexion">
          <div className="auth-card-header">
            <p className="auth-eyebrow">Connexion</p>
            <h2>Choisissez votre methode</h2>
            <p className="auth-card-text">
              Utilisez votre SSO d entreprise ou un compte Google autorise.
            </p>
          </div>

          <div className="auth-actions">
            <button className="auth-button auth-button--keycloak" onClick={handleKeycloakLogin}>
              <span className="auth-button-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <circle cx="9" cy="12" r="3.5" />
                  <path d="M12.5 12H21M18 12V9M18 12V15" />
                </svg>
              </span>
              <span className="auth-button-text">Continuer avec Keycloak</span>
              <span className="auth-button-pill">SSO</span>
            </button>

            <button className="auth-button auth-button--google" onClick={handleGoogleLogin}>
              <span className="auth-button-icon auth-button-icon--google" aria-hidden="true">
                G
              </span>
              <span className="auth-button-text">Continuer avec Google</span>
            </button>
          </div>

          <div className="auth-note">Google utilise le fournisseur configure dans Keycloak.</div>

          <div className="auth-card-footer">Besoin d acces ? Contactez votre administrateur.</div>
        </section>
      </main>
    </div>
  );
}
