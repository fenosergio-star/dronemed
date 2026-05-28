import { useEffect, useState } from 'react';
import { ordersAPI, workflowAPI, fleetAPI } from '../services/api';

interface Order {
  id: string; urgency: string; status: string; requestedAt: string;
  droneId?: string; priorityScore?: number; patientId?: string;
  verificationCode?: string; qrCode?: string; validatedAt?: string;
}
interface Drone { id: string; name: string; status: string; currentBattery: number; }

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [queue, setQueue] = useState<Order[]>([]);
  const [pending, setPending] = useState<Order[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDrone, setSelectedDrone] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [o, q, p, f] = await Promise.all([
        ordersAPI.getAll(), ordersAPI.getQueue(),
        workflowAPI.getPending(), fleetAPI.getAvailable(),
      ]);
      setOrders(o.data.data || []);
      setQueue(q.data.data || []);
      setPending(p.data.data || []);
      setDrones(f.data.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doValidate = async (id: string) => {
    await workflowAPI.validate(id);
    setMessage('✅ Commande validée');
    load();
  };

  const doAssign = async (orderId: string) => {
    if (!selectedDrone) { setMessage('⚠️ Sélectionnez un drone'); return; }
    await workflowAPI.assignDrone(orderId, selectedDrone);
    setMessage(`✅ Drone ${selectedDrone} assigné`);
    load();
  };

  const doDispatch = async (id: string) => {
    try {
      const res = await workflowAPI.dispatch(id, {
        droneId: selectedDrone,
        startLat: -18.9, startLng: 47.5,
        endLat: -19.0, endLng: 47.6,
        batteryLevel: 95,
      });
      setMessage(`✅ Mission lancée ! QR: ${res.data.qrCode}`);
      load();
    } catch (e: any) { setMessage(`❌ ${e.response?.data?.error || 'Erreur'}`); }
  };

  const doConfirm = async (id: string) => {
    if (!confirmCode) { setMessage('⚠️ Entrez le code'); return; }
    try {
      await workflowAPI.confirmDelivery(id, confirmCode);
      setMessage('✅ Livraison confirmée !');
      setConfirmCode('');
      load();
    } catch (e: any) { setMessage(`❌ Code invalide`); }
  };

  const urgencyColor = (u: string) => ({
    critique: 'badge-danger', vitale: 'badge-warning',
    urgent: 'badge-info', routine: 'badge-success',
  }[u] || 'badge-info');

  const statusColor = (s: string) => ({
    pending: 'badge-warning', validated: 'badge-info',
    in_transit: 'badge-info', delivered: 'badge-success',
    cancelled: 'badge-danger',
  }[s] || 'badge-info');

  if (loading) return <div className="card"><p>Chargement...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h2>📋 Validation des Commandes</h2>
        <button className="btn btn-outline" onClick={load}>Actualiser</button>
      </div>

      {message && (
        <div className="card" style={{ marginBottom: 12, padding: 12, background: message.startsWith('✅') ? '#e6f4ea' : '#fce8e6' }}>
          {message}
        </div>
      )}

      {/* Pending orders - validation workflow */}
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #f9ab00' }}>
          <h3 style={{ marginBottom: 12 }}>⏳ Commandes en attente de validation ({pending.length})</h3>
          <table>
            <thead><tr><th>ID</th><th>Urgence</th><th>Demandé</th><th>Actions</th></tr></thead>
            <tbody>
              {pending.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.id.slice(0, 8)}...</td>
                  <td><span className={`badge ${urgencyColor(o.urgency)}`}>{o.urgency}</span></td>
                  <td>{new Date(o.requestedAt).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => { setSelectedOrder(o); doValidate(o.id); }}>
                      ✅ Valider
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign & dispatch */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>🚁 Assigner & Lancer une mission</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #dadce0', flex: 1 }}
            onChange={e => setSelectedOrder(orders.find(o => o.id === e.target.value) || null)}>
            <option value="">Choisir commande validée...</option>
            {orders.filter(o => o.status === 'validated').map(o => (
              <option key={o.id} value={o.id}>{o.id.slice(0, 8)}... ({o.urgency})</option>
            ))}
          </select>
          <select style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #dadce0', flex: 1 }}
            onChange={e => setSelectedDrone(e.target.value)}>
            <option value="">Choisir drone...</option>
            {drones.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.currentBattery}%)</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => selectedOrder && doDispatch(selectedOrder.id)}
            disabled={!selectedOrder || !selectedDrone}>
            🚀 Lancer
          </button>
        </div>
      </div>

      {/* Confirm delivery */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>📱 Confirmer une livraison</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #dadce0', flex: 1 }}
            onChange={e => setSelectedOrder(orders.find(o => o.id === e.target.value) || null)}>
            <option value="">Choisir commande en transit...</option>
            {orders.filter(o => o.status === 'in_transit').map(o => (
              <option key={o.id} value={o.id}>{o.id.slice(0, 8)}... (QR: {o.qrCode})</option>
            ))}
          </select>
          <input style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #dadce0', fontFamily: 'monospace' }}
            placeholder="Code vérification" value={confirmCode} onChange={e => setConfirmCode(e.target.value)} maxLength={6} />
          <button className="btn btn-primary" onClick={() => selectedOrder && doConfirm(selectedOrder.id)}>
            ✅ Confirmer
          </button>
        </div>
      </div>

      {/* Priority Queue */}
      {queue.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>🎯 File de Priorité (Tas Binaire)</h3>
          <table>
            <thead><tr><th>#</th><th>ID</th><th>Urgence</th><th>Statut</th><th>Demandé</th></tr></thead>
            <tbody>
              {queue.slice(0, 15).map((o, i) => (
                <tr key={o.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.id.slice(0, 8)}...</td>
                  <td><span className={`badge ${urgencyColor(o.urgency)}`}>{o.urgency}</span></td>
                  <td><span className={`badge ${statusColor(o.status)}`}>{o.status}</span></td>
                  <td>{new Date(o.requestedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All orders */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>📋 Toutes les commandes</h3>
        <table>
          <thead><tr><th>ID</th><th>Urgence</th><th>Statut</th><th>Drone</th><th>Code</th><th>Demandé</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.id.slice(0, 8)}...</td>
                <td><span className={`badge ${urgencyColor(o.urgency)}`}>{o.urgency}</span></td>
                <td><span className={`badge ${statusColor(o.status)}`}>{o.status}</span></td>
                <td>{o.droneId ? o.droneId.slice(0, 8) : '-'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{o.verificationCode || '-'}</td>
                <td>{new Date(o.requestedAt).toLocaleString()}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center' }}>Aucune commande</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
