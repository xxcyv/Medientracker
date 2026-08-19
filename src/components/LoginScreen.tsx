import { useAuth } from '../auth/AuthContext';

/** Gate shown before sign-in; the app cannot function without a Google account that can read the sheet. */
export function LoginScreen() {
  const { signIn, error, loading } = useAuth();

  if (loading) return <p>Lade…</p>;

  return (
    <div className="login-screen">
      <h1>Medientracker</h1>
      <p>Melde dich mit dem Google-Konto an, das Zugriff auf die Tracking-Tabelle hat.</p>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => signIn()}>
        Mit Google anmelden
      </button>
    </div>
  );
}
