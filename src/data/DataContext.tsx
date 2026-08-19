import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchAllYearSheets, SheetsAuthError } from '../sheets/sheetsApi';
import { parseLegacySheet, parseYearSheet } from '../sheets/parseSheet';
import { applyMediaGroups, buildMedia } from '../sheets/aggregate';
import type { Category, MediaGroup, Medium } from '../sheets/types';
import { createGroupId, loadMediaGroups, saveMediaGroups } from './mediaGroups';

interface DataState {
  /** Media with user-defined groups merged in; use this for the list view and statistics. */
  media: Medium[];
  groups: MediaGroup[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  createGroup: (category: Category, memberNames: string[], label: string) => void;
  deleteGroup: (id: string) => void;
}

const DataContext = createContext<DataState | undefined>(undefined);

/** Fetches the spreadsheet, parses it into media once the user is signed in, and caches the result. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [rawMedia, setRawMedia] = useState<Medium[]>([]);
  const [groups, setGroups] = useState<MediaGroup[]>(() => loadMediaGroups());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  // Fetches and parses every year sheet; re-run on mount, on token change and when reload() is called.
  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const sheets = await fetchAllYearSheets(accessToken);
      const extractions = sheets.flatMap((sheet) =>
        sheet.title === 'Legacy' ? parseLegacySheet(sheet.values) : parseYearSheet(sheet.title, sheet.values),
      );
      setRawMedia(buildMedia(extractions));
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

  // Adds a new user-defined group and persists the updated list to local storage.
  const createGroup = useCallback((category: Category, memberNames: string[], label: string) => {
    setGroups((current) => {
      const next = [...current, { id: createGroupId(), category, label, memberNames }];
      saveMediaGroups(next);
      return next;
    });
  }, []);

  // Removes a group by id and persists the updated list to local storage.
  const deleteGroup = useCallback((id: string) => {
    setGroups((current) => {
      const next = current.filter((group) => group.id !== id);
      saveMediaGroups(next);
      return next;
    });
  }, []);

  const media = useMemo(() => applyMediaGroups(rawMedia, groups), [rawMedia, groups]);

  return (
    <DataContext.Provider
      value={{ media, groups, loading, error, reload: () => setReloadCounter((n) => n + 1), createGroup, deleteGroup }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataState {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
