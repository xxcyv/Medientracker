declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
  }

  interface TokenClient {
    requestAccessToken(overrides?: { prompt?: string }): void;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
  function revoke(token: string, callback: () => void): void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: typeof google.accounts.oauth2.initTokenClient;
        revoke: typeof google.accounts.oauth2.revoke;
      };
    };
  };
}