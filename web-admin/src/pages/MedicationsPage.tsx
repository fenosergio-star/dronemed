import { useState, useEffect } from 'react';
import api from '../services/api';

interface Medication {
  id: string;
  name: string;
  type: string;
  description: string;
  category: string;
  defaultStorageTempMin: number;
  defaultStorageTempMax: number;
  unit: string;
  isActive: boolean;
}

export function MedicationsPage() {
  const [items, setItems] = useState<Medication[]>([]);
  const [busy, setBusy] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'medicament', category: '', unit: 'unité', defaultStorageTempMin: 2, defaultStorageTempMax: 8 });

  useEffect(() => {
    api.get('/medications').then(r => setItems(r.data.data)).finally(() => setBusy(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api.post('/medications', form);
    setItems(prev => [...prev, r.data.data]);
    setShowForm(false);
    setForm({ name: '', type: 'medicament', category: '', unit: 'unité', defaultStorageTempMin: 2, defaultStorageTempMax: 8 });
  };

  const remove = async (id: string) => {
    await api.delete(`/medications/${id}`);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (busy) return <div className="loading">Chargement...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>💊 Catalogue Médicaments</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouveau médicament'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Nom</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="medicament">Médicament</option>
                  <option value="vaccin">Vaccin</option>
                  <option value="poche_sang">Poche de sang</option>
                </select>
              </div>
              <div className="form-group">
                <label>Catégorie</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Unité</label>
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Temp. min (°C)</label>
                <input type="number" value={form.defaultStorageTempMin} onChange={e => setForm(f => ({ ...f, defaultStorageTempMin: +e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Temp. max (°C)</label>
                <input type="number" value={form.defaultStorageTempMax} onChange={e => setForm(f => ({ ...f, defaultStorageTempMax: +e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: 16, width: 'auto' }}>Enregistrer</button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Catégorie</th>
              <th>Unité</th>
              <th>Temp. stockage</th>
              <th>Actif</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td><span className="badge">{m.type}</span></td>
                <td>{m.category}</td>
                <td>{m.unit}</td>
                <td>{m.defaultStorageTempMin}°C - {m.defaultStorageTempMax}°C</td>
                <td>{m.isActive ? '✅' : '❌'}</td>
                <td><button className="btn-sm" onClick={() => remove(m.id)}>Suppr.</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
