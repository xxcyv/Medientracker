import { useEffect, useRef } from 'react';
import { HashRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DataProvider } from './data/DataContext';
import { ThemeProvider } from './theme/ThemeContext';
import { CategoryFilterProvider } from './state/CategoryFilterContext';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { InfoPage } from './features/info/InfoPage';
import { MediaListPage } from './features/list/MediaListPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { FiltersPage } from './features/filters/FiltersPage';
import { ExportPage } from './features/export/ExportPage';

// Local-storage flag that ensures the info page is only auto-opened once, on the very first login.
const INFO_SEEN_KEY = 'medienkonsum:info-seen';

/** Chooses between the login gate and the actual app, based on whether a usable Sheets token exists. */
function AppRoutes() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const hasCheckedFirstLogin = useRef(false);

  // Opens the info page automatically the first time a user ever logs in on this browser.
  useEffect(() => {
    if (!user || !accessToken || hasCheckedFirstLogin.current) return;
    hasCheckedFirstLogin.current = true;
    if (!localStorage.getItem(INFO_SEEN_KEY)) {
      localStorage.setItem(INFO_SEEN_KEY, 'true');
      navigate('/info', { replace: true });
    }
  }, [user, accessToken, navigate]);

  // Sheets access tokens expire after about an hour; AuthProvider silently re-requests one on reload.
  if (!user || !accessToken) return <LoginScreen />;

  return (
    <DataProvider>
      <CategoryFilterProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="info" element={<InfoPage />} />
            <Route index element={<MediaListPage />} />
            <Route path="kalender" element={<CalendarPage />} />
            <Route path="filter" element={<FiltersPage />} />
            <Route path="export" element={<ExportPage />} />
          </Route>
        </Routes>
      </CategoryFilterProvider>
    </DataProvider>
  );
}

// Root component: wires up the global providers and the hash-based router.
export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
