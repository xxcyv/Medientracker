import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DataProvider } from './data/DataContext';
import { ThemeProvider } from './theme/ThemeContext';
import { CategoryFilterProvider } from './state/CategoryFilterContext';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { MediaListPage } from './features/list/MediaListPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { FiltersPage } from './features/filters/FiltersPage';
import { ExportPage } from './features/export/ExportPage';

/** Chooses between the login gate and the actual app, based on whether a usable Sheets token exists. */
function AppRoutes() {
  const { user, accessToken } = useAuth();

  // Sheets access tokens expire after about an hour; AuthProvider silently re-requests one on reload.
  if (!user || !accessToken) return <LoginScreen />;

  return (
    <DataProvider>
      <CategoryFilterProvider>
        <Routes>
          <Route element={<Layout />}>
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
