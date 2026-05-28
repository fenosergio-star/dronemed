import { useEffect, useState } from 'react';
import { inventoryAPI } from '../services/api';

interface InventoryItem {
  id: string; name: string; type: string; quantity: number;
  expirationDate: string; batchNumber: string;
  storageTempMin?: number; storageTempMax?: number; createdAt?: string;
}

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'medicament', quantity: 0, expirationDate: '', batchNumber: '', storageTempMin: 2, storageTempMax: 8 });
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const [inv, al] = await Promise.all([inventoryAPI.getAll(), inventoryAPI.getAlerts()]);
      setItems(inv.data.data || []);
      setAlerts(al.data.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.expirationDate) return;
    await inventoryAPI.add(form);
    setShowForm(false);
    setForm({ name: '', type: 'medicament', quantity: 0, expirationDate: '', batchNumber: '', storageTempMin: 2, storageTempMax: 8 });
    load();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await inventoryAPI.remove(id);
    load();
  };

  const daysLeft = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

  const filteredItems = items.filter(i => {
    const d = daysLeft(i.expirationDate);
    if (filter === 'expiring') return d >= 0 && d <= 30;
    if (filter === 'expired') return d < 0;
    return true;
  }).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

  const expiringCount = items.filter(i => { const d = daysLeft(i.expirationDate); return d >= 0 && d <= 30; }).length;
  const expiredCount = items.filter(i => daysLeft(i.expirationDate) < 0).length;

  if (loading) return <div className="card"><p>Chargement...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h2>📦 Inventaire (AVL Tree)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Fermer' : '+ Ajouter'}
          </button>
          <button className="btn btn-outline" onClick={() => inventoryAPI.rotate()}>Rotation Stock</button>
          <button className="btn btn-outline" onClick={load}>Actualiser</button>
        </div>
      </div>

      {/* Alertes AVL */}
      {alerts && (alerts.expired?.count > 0 || alerts.expiringSoon?.count > 0) && (
        <div className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${alerts.expired?.count > 0 ? '#d93025' : '#f9ab00'}`, background: alerts.expired?.count > 0 ? '#fce8e6' : '#fef7e0' }}>
          <strong>
            {alerts.expired?.count > 0 ? `🚨 ${alerts.expired.count} produit(s) périmé(s) !` : ''}
            {alerts.expired?.count > 0 && alerts.expiringSoon?.count > 0 ? ' | ' : ''}
            {alerts.expiringSoon?.count > 0 ? `⚠️ ${alerts.expiringSoon.count} produit(s) expire(nt) bientôt` : ''}
          </strong>
          {alerts.expired?.items?.map((i: any) => (
            <div key={i.id} style={{ fontSize: 13, marginTop: 4, color: '#d93025' }}>
              ❌ {i.name} (lot {i.batchNumber}) - Périmé depuis {Math.abs(daysLeft(i.expirationDate))}j
            </div>
          ))}
          {alerts.expiringSoon?.items?.slice(0, 5).map((i: any) => (
            <div key={i.id} style={{ fontSize: 13, marginTop: 4, color: '#e37400' }}>
              ⚠️ {i.name} (lot {i.batchNumber}) - expire dans {daysLeft(i.expirationDate)}j
            </div>
          ))}
        </div>
      )}

      {/* Stats cards */}
      <div className="card-grid">
        <div className="card stat-card">
          <div className="stat-value">{items.length}</div>
          <div className="stat-label">Total produits</div>
        </div>
        <div className="card stat-card warning">
          <div className="stat-value">{expiringCount}</div>
          <div className="stat-label">Expire ≤ 30j</div>
        </div>
        <div className={expiredCount > 0 ? "card stat-card danger" : "card stat-card"}>
          <div className="stat-value">{expiredCount}</div>
          <div className="stat-label">Périmés</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{items.reduce((s, i) => s + i.quantity, 0)}</div>
          <div className="stat-label">Unités totales</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Nouveau produit</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <input placeholder="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              style={inputStyle} />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              <option value="medicament">Médicament</option><option value="vaccin">Vaccin</option><option value="poche_sang">Poche de Sang</option>
            </select>
            <input type="number" placeholder="Quantité" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })}
              style={inputStyle} />
            <input type="date" value={form.expirationDate} onChange={e => setForm({ ...form, expirationDate: e.target.value })}
              style={inputStyle} />
            <input placeholder="N° Lot" value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })}
              style={inputStyle} />
            <button className="btn btn-primary" onClick={handleAdd}>Ajouter au stock (AVL)</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['all', 'expiring', 'expired'] as const).map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Tous' : f === 'expiring' ? `Expire bientôt (${expiringCount})` : `Périmés (${expiredCount})`}
          </button>
        ))}
      </div>

      {/* Inventory table (sorted by expiration via AVL) */}
      <div className="card">
        <table>
          <thead><tr><th>Nom</th><th>Type</th><th>Qté</th><th>Lot</th><th>Temp.</th><th>Expiration</th><th>Jours</th><th>Action</th></tr></thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#5f6368', padding: 24 }}>Aucun produit trouvé</td></tr>
            ) : filteredItems.map(item => {
              const d = daysLeft(item.expirationDate);
              return (
                <tr key={item.id} style={d < 0 ? { background: '#fce8e6' } : d <= 30 ? { background: '#fef7e0' } : {}}>
                  <td><strong>{item.name}</strong></td>
                  <td><span className={`badge ${item.type === 'poche_sang' ? 'badge-danger' : item.type === 'vaccin' ? 'badge-warning' : 'badge-info'}`}>{item.type}</span></td>
                  <td>{item.quantity}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.batchNumber}</td>
                  <td style={{ fontSize: 12 }}>{item.storageTempMin ?? '?'}°–{item.storageTempMax ?? '?'}°</td>
                  <td>{new Date(item.expirationDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${d < 0 ? 'badge-danger' : d <= 7 ? 'badge-danger' : d <= 30 ? 'badge-warning' : 'badge-success'}`}>
                      {d < 0 ? `Périmé (${Math.abs(d)}j)` : `${d}j`}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: 11, color: '#d93025' }}
                      onClick={() => handleRemove(item.id)}>🗑</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 12, color: '#5f6368' }}>
          📊 {filteredItems.length} affiché(s) sur {items.length} total • Trié par AVL Tree (date d'expiration)
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #dadce0', fontSize: 14,
};
