import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';

type Lang = 'fr' | 'mg';

const labels: Record<Lang, typeof navFr> = {
  fr: {
    dashboard: 'Tableau de Bord', inventory: 'Inventaire',
    fleet: 'Flotte', orders: 'Commandes', map: 'Carte',
    lang: 'MG', langLabel: 'Malagasy',
  },
  mg: {
    dashboard: 'Tabilao', inventory: 'Fitehirizana',
    fleet: 'Drone', orders: 'Baiko', map: 'Sarintany',
    lang: 'FR', langLabel: 'Français',
  },
};

const navFr = {
  dashboard: '', inventory: '', fleet: '', orders: '', map: '',
  lang: '', langLabel: '',
};

const navItems = [
  { to: '/', key: 'dashboard' as const, icon: '📊' },
  { to: '/inventory', key: 'inventory' as const, icon: '📦' },
  { to: '/fleet', key: 'fleet' as const, icon: '🚁' },
  { to: '/orders', key: 'orders' as const, icon: '📋' },
  { to: '/map', key: 'map' as const, icon: '🗺️' },
];

export function Layout({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr');
  const t = labels[lang];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🚁 DroneMed</h1>
          <span>Madagascar 2035</span>
        </div>
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
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid #dadce0' }}>
          <button
            onClick={() => setLang(lang === 'fr' ? 'mg' : 'fr')}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #dadce0',
              background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            }}
          >
            🌐 {t.langLabel} ({t.lang})
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
