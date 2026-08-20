import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';

/** App shell with top bar (user info, sign-out) and bottom navigation, optimized for mobile use. */
export function Layout() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Medientracker</h1>
        <div className="app-user">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Zu Tag-Modus wechseln' : 'Zu Nacht-Modus wechseln'}
            title={theme === 'dark' ? 'Zu Tag-Modus wechseln' : 'Zu Nacht-Modus wechseln'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user && (
            <>
              <span>{user.displayName}</span>
              <button type="button" onClick={() => signOut()}>
                Abmelden
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-nav">
        <NavLink to="/info">Info</NavLink>
        <NavLink to="/" end>
          Liste
        </NavLink>
        <NavLink to="/kalender">Kalender</NavLink>
        <NavLink to="/filter">Statistiken</NavLink>
        <NavLink to="/export">Export</NavLink>
      </nav>
    </div>
  );
}
