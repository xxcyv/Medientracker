import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { googleClientId } from '../config/env';

// Scope needed to read the tracking spreadsheet via the Google Sheets REST API.
const SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

interface User {
  displayName: string;
  email: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services konnte nicht geladen werden.'));
    document.head.append(script);
  });
}

/** Provides Google sign-in and the Sheets OAuth token used directly by the client. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<google.accounts.oauth2.TokenClient | null>(null);

  useEffect(() => {
    loadGoogleIdentityServices()
      .then(() => {
        if (!googleClientId) throw new Error('VITE_GOOGLE_CLIENT_ID ist nicht konfiguriert.');
        setTokenClient(
          window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: `${SHEETS_READONLY_SCOPE} openid email profile`,
            callback: handleTokenResponse,
          }),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Anmeldung konnte nicht vorbereitet werden.');
      })
      .finally(() => {
        setLoading(false);
      });

    async function handleTokenResponse(response: google.accounts.oauth2.TokenResponse) {
      if (response.error || !response.access_token) {
        setError(response.error_description ?? 'Anmeldung fehlgeschlagen.');
        return;
      }

      try {
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        });
        if (!profileResponse.ok) throw new Error('Google-Profil konnte nicht geladen werden.');
        const profile = (await profileResponse.json()) as { email?: string; name?: string };
        setAccessToken(response.access_token);
        setUser({ displayName: profile.name ?? profile.email ?? 'Google-Konto', email: profile.email ?? '' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
      }
    }

    return () => {
      setTokenClient(null);
    };
  }, []);

  function signIn() {
    setError(null);
    if (!tokenClient) {
      setError('Google Identity Services ist noch nicht bereit.');
      return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  async function signOut() {
    if (accessToken && window.google?.accounts.oauth2) {
      await new Promise<void>((resolve) => {
        window.google.accounts.oauth2.revoke(accessToken, () => resolve());
      });
    }
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
