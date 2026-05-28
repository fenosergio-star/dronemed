import { useEffect, useState, useRef } from 'react';
import { inventoryAPI, fleetAPI, ordersAPI } from '../services/api';
import { statsAPI } from '../services/api';
import { connectWebSocket, DroneUpdate } from '../services/websocket';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#d93025', '#e37400', '#f9ab00', '#1e8e3e'];

interface DashboardData {
  overview: { total: number; delivered: number; inTransit: number; pending: number; cancelled: number; validated: number };
  byUrgency: { critique: number; vitale: number; urgent: number; routine: number };
  avgDeliveryTime: number;
  completionRate: number;
  monthlyTrend: { date: string; count: number }[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [drones, setDrones] = useState<DroneUpdate[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [liveOrders, setLiveOrders] = useState({ pending: 0, inTransit: 0, deliveredToday: 0 });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    Promise.all([
      statsAPI.getDashboard(),
      fleetAPI.getLive(),
      inventoryAPI.getAlerts(),
      ordersAPI.getAll(),
    ]).then(([s, f, a, o]) => {
      setStats(s.data.data);
      setDrones(f.data.data || []);
      setAlerts(a.data.data);
      const orders = o.data.data || [];
      const today = new Date().toISOString().slice(0, 10);
      setLiveOrders({
        pending: orders.filter((ord: any) => ord.status === 'pending').length,
        inTransit: orders.filter((ord: any) => ord.status === 'in_transit').length,
        deliveredToday: orders.filter(
          (ord: any) => ord.status === 'delivered' && ord.deliveredAt?.slice(0, 10) === today
        ).length,
      });
    }).catch(() => {});

    wsRef.current = connectWebSocket(
      () => {},
      (fleet) => setDrones(fleet)
    );
    return () => wsRef.current?.close();
  }, []);

  const urgencyPie = stats ? Object.entries(stats.byUrgency).map(([name, value]) => ({ name, value })) : [];

  return (
    <div>
      <div className="page-header">
        <h2>🚁 Tableau de Bord Pharmacien</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge ${drones.some(d => d.status === 'en_route' || d.status === 'returning') ? 'badge-success' : 'badge-info'}`}>
            📡 {drones.filter(d => d.status === 'en_route' || d.status === 'returning').length} vol(s) en cours
          </span>
        </div>
      </div>

      <div className="card-grid">
        <div className="card stat-card success">
          <div className="stat-value">{liveOrders.deliveredToday}</div>
          <div className="stat-label">Livrées aujourd'hui</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{liveOrders.inTransit}</div>
          <div className="stat-label">En transit</div>
        </div>
        <div className="card stat-card warning">
          <div className="stat-value">{liveOrders.pending}</div>
          <div className="stat-label">En attente</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{drones.filter(d => d.status === 'idle').length}/{drones.length}</div>
          <div className="stat-label">Drones disponibles</div>
        </div>
        <div className="card stat-card" style={{ background: alerts?.expired?.count > 0 ? '#fce8e6' : '' }}>
          <div className="stat-value" style={{ color: alerts?.expired?.count > 0 ? '#d93025' : undefined }}>
            {alerts?.expired?.count || 0}
          </div>
          <div className="stat-label">Produits périmés</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.completionRate || 0}%</div>
          <div className="stat-label">Taux de complétion</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>📈 Tendance des commandes (30 jours)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1a73e8" strokeWidth={2} dot={{ fill: '#1a73e8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12 }}>🎯 Urgence des commandes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={urgencyPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                {urgencyPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>🚁 État de la flotte en direct</h3>
        <table>
          <thead>
            <tr><th>Drone</th><th>Batterie</th><th>Statut</th><th>Position</th><th>Mission</th></tr>
          </thead>
          <tbody>
            {drones.map(d => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="battery-bar" style={{ flex: 1 }}>
                      <div className="battery-bar-fill"
                        style={{ width: `${d.battery}%`, background: d.battery < 20 ? '#d93025' : d.battery < 40 ? '#f9ab00' : '#1e8e3e' }} />
                    </div>
                    <span style={{ fontSize: 12 }}>{d.battery}%</span>
                  </div>
                </td>
                <td><span className={`badge ${d.status === 'idle' ? 'badge-success' : d.status === 'en_route' ? 'badge-info' : d.status === 'charging' ? 'badge-warning' : d.status === 'emergency' ? 'badge-danger' : 'badge-info'}`}>{d.status}</span></td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.position ? `${d.position.lat.toFixed(4)}, ${d.position.lng.toFixed(4)}` : '-'}</td>
                <td>{d.hasMission ? '✅' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
