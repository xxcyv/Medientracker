import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** App shell with top bar (user info, sign-out) and bottom navigation, optimized for mobile use. */
export function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Medienkonsum-Tracker</h1>
        {user && (
          <div className="app-user">
            <span>{user.displayName}</span>
            <button type="button" onClick={() => signOut()}>
              Abmelden
            </button>
          </div>
        )}
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-nav">
        <NavLink to="/" end>
          Liste
        </NavLink>
        <NavLink to="/kalender">Kalender</NavLink>
        <NavLink to="/filter">Filter</NavLink>
      </nav>
    </div>
  );
}
