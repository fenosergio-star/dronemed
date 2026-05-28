import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Lang = 'fr' | 'mg';

const labels: Record<Lang, typeof navFr> = {
  fr: {
    dashboard: 'Tableau de Bord', inventory: 'Inventaire',
    fleet: 'Flotte', orders: 'Commandes', map: 'Carte',
    reports: 'Rapports', logout: 'Déconnexion',
    lang: 'MG', langLabel: 'Malagasy',
  },
  mg: {
    dashboard: 'Tabilao', inventory: 'Fitehirizana',
    fleet: 'Drone', orders: 'Baiko', map: 'Sarintany',
    reports: 'Tatitra', logout: 'Fialana',
    lang: 'FR', langLabel: 'Français',
  },
};

const navFr = {
  dashboard: '', inventory: '', fleet: '', orders: '', map: '',
  reports: '', logout: '', lang: '', langLabel: '',
};

const navItems = [
  { to: '/', key: 'dashboard' as const, icon: '📊' },
  { to: '/inventory', key: 'inventory' as const, icon: '📦' },
  { to: '/fleet', key: 'fleet' as const, icon: '🚁' },
  { to: '/orders', key: 'orders' as const, icon: '📋' },
  { to: '/map', key: 'map' as const, icon: '🗺️' },
  { to: '/reports', key: 'reports' as const, icon: '📋' },
];

export function Layout({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr');
  const { user, logout } = useAuth();
  const t = labels[lang];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🚁 DroneMed</h1>
          <span>Madagascar 2035</span>
        </div>
        {user && (
          <div className="sidebar-user">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
        )}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span>{item.icon}</span>
              {t[item.key]}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => setLang(lang === 'fr' ? 'mg' : 'fr')}>
            🌐 {t.langLabel} ({t.lang})
          </button>
          <button onClick={logout} className="logout-btn">
            🚪 {t.logout}
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
