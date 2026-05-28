import { useEffect, useState, useRef } from 'react';
import { fleetAPI, fleetSimAPI } from '../services/api';
import { connectWebSocket, DroneUpdate } from '../services/websocket';

interface SimDrone {
  id: string; name: string; position: { lat: number; lng: number };
  battery: number; status: string; mission: { orderId: string; progress: number; returning: boolean } | null;
}

export function FleetPage() {
  const [drones, setDrones] = useState<SimDrone[]>([]);
  const [liveDrones, setLiveDrones] = useState<DroneUpdate[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sim, live] = await Promise.all([
        fleetSimAPI.getSimulated(),
        fleetAPI.getLive(),
      ]);
      setDrones(sim.data.data || []);
      setLiveDrones(live.data.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    wsRef.current = connectWebSocket(
      () => {},
      (fleet) => {
        setLiveDrones(fleet);
        setDrones(prev => prev.map(d => {
          const live = fleet.find((f: DroneUpdate) => f.id === d.id);
          return live ? { ...d, battery: live.battery, status: live.status, position: live.position } : d;
        }));
      }
    );
    return () => wsRef.current?.close();
  }, []);

  const doCharge = async (id: string) => {
    await fleetSimAPI.charge(id);
    setMessage(`🔋 Drone ${id} en charge`);
    load();
  };

  const doMaintenance = async (id: string, active: boolean) => {
    await fleetSimAPI.maintenance(id, active);
    setMessage(active ? `🔧 Drone ${id} en maintenance` : `✅ Drone ${id} remis en service`);
    load();
  };

  const batteryColor = (lvl: number) => lvl < 20 ? '#d93025' : lvl < 40 ? '#f9ab00' : '#1e8e3e';
  const statusStyle = (s: string) => ({
    idle: 'badge-success', charging: 'badge-warning',
    en_route: 'badge-info', returning: 'badge-info',
    maintenance: 'badge-warning', emergency: 'badge-danger',
  }[s] || 'badge-info');

  if (loading) return <div className="card"><p>Chargement...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h2>🚁 Supervision Flotte</h2>
        <button className="btn btn-outline" onClick={load}>Actualiser</button>
      </div>

      {message && (
        <div className="card" style={{ marginBottom: 12, padding: 12, background: '#e6f4ea' }}>{message}</div>
      )}

      <div className="card-grid">
        <div className="card stat-card success">
          <div className="stat-value">{drones.filter(d => d.status === 'idle').length}</div>
          <div className="stat-label">Disponibles</div>
        </div>
        <div className="card stat-card warning">
          <div className="stat-value">{drones.filter(d => d.status === 'charging').length}</div>
          <div className="stat-label">En charge</div>
        </div>
        <div className="card stat-card info" style={{ background: '#e8f0fe' }}>
          <div className="stat-value" style={{ color: '#1a73e8' }}>{drones.filter(d => d.status === 'en_route' || d.status === 'returning').length}</div>
          <div className="stat-label">En vol</div>
        </div>
        <div className="card stat-card danger">
          <div className="stat-value">{drones.filter(d => d.battery < 20).length}</div>
          <div className="stat-label">Batterie critique</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Nom</th><th>Batterie</th><th>Statut</th><th>Position</th><th>Mission</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {drones.map(d => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="battery-bar" style={{ flex: 1 }}>
                      <div className="battery-bar-fill" style={{ width: `${d.battery}%`, background: batteryColor(d.battery) }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{d.battery}%</span>
                  </div>
                </td>
                <td><span className={`badge ${statusStyle(d.status)}`}>{d.status}</span></td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {d.position ? `${d.position.lat.toFixed(4)}, ${d.position.lng.toFixed(4)}` : '-'}
                </td>
                <td>
                  {d.mission ? (
                    <div>
                      <span style={{ fontSize: 12 }}>📍 {d.mission.progress}%</span>
                      {d.mission.returning && <span className="badge badge-info" style={{ marginLeft: 4 }}>Retour</span>}
                    </div>
                  ) : <span style={{ color: '#5f6368' }}>—</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => doCharge(d.id)} disabled={d.status !== 'idle'}>
                      🔋
                    </button>
                    <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => doMaintenance(d.id, d.status !== 'maintenance')}>
                      {d.status === 'maintenance' ? '✅' : '🔧'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>📡 WebSocket - État en temps réel</h3>
        <div style={{ maxHeight: 200, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
          {liveDrones.map(d => (
            <div key={d.id} style={{ padding: '4px 0', borderBottom: '1px solid #f1f3f4' }}>
              🚁 {d.name} → Bat: {d.battery}% | {d.status} | 📍 {d.position ? `${d.position.lat.toFixed(4)}, ${d.position.lng.toFixed(4)}` : 'N/A'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
