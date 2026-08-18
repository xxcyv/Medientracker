import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DataProvider } from './data/DataContext';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { MediaListPage } from './features/list/MediaListPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { FiltersPage } from './features/filters/FiltersPage';

/** Chooses between the login gate and the actual app, based on whether a usable Sheets token exists. */
function AppRoutes() {
  const { user, accessToken } = useAuth();

  // Sheets access tokens expire after about an hour and are not persisted.
  if (!user || !accessToken) return <LoginScreen />;

  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<MediaListPage />} />
          <Route path="kalender" element={<CalendarPage />} />
          <Route path="filter" element={<FiltersPage />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
