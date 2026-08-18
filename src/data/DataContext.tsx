import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchAllYearSheets, SheetsAuthError } from '../sheets/sheetsApi';
import { parseYearSheet } from '../sheets/parseSheet';
import { buildMedia } from '../sheets/aggregate';
import type { Medium } from '../sheets/types';

interface DataState {
  media: Medium[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const DataContext = createContext<DataState | undefined>(undefined);

/** Fetches the spreadsheet, parses it into media once the user is signed in, and caches the result. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [media, setMedia] = useState<Medium[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const sheets = await fetchAllYearSheets(accessToken);
      const extractions = sheets.flatMap((sheet) => parseYearSheet(sheet.title, sheet.values));
      setMedia(buildMedia(extractions));
    } catch (err) {
      setError(
        err instanceof SheetsAuthError
          ? err.message
          : 'Die Daten konnten nicht geladen werden. Bitte später erneut versuchen.',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load, reloadCounter]);

  return (
    <DataContext.Provider value={{ media, loading, error, reload: () => setReloadCounter((n) => n + 1) }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataState {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
