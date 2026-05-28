import { useState, useEffect } from 'react';
import api from '../services/api';

interface UserActivity {
  id: string;
  name: string;
  email: string;
  role: string;
  total_orders: number;
  delivered: number;
  pending: number;
  in_transit: number;
  last_activity: string;
}

export function ReportsPage() {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [busy, setBusy] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    api.get('/reports/user-activity').then(r => {
      setUsers(r.data.data);
    }).finally(() => setBusy(false));
  }, []);

  const loadTransactions = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingTx(true);
    try {
      const r = await api.get('/reports/user-transactions', { params: { userId } });
      setTransactions(r.data.data[0]?.transactions || []);
    } finally {
      setLoadingTx(false);
    }
  };

  const exportCSV = async (userId: string) => {
    const r = await api.get('/reports/user-transactions', {
      params: { userId, format: 'csv' },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${userId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllCSV = async () => {
    const r = await api.get('/reports/user-transactions', {
      params: { format: 'csv' },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport-toutes-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (busy) return <div className="loading">Chargement...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>📋 Rapports d'activité</h1>
        <button className="btn-secondary" onClick={exportAllCSV}>📥 Exporter tout (CSV)</button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Activité par utilisateur</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Commandes</th>
              <th>Livrées</th>
              <th>En cours</th>
              <th>Dernière activité</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>{u.total_orders}</td>
                <td>{u.delivered}</td>
                <td>{u.in_transit}</td>
                <td>{u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '-'}</td>
                <td>
                  <button className="btn-sm" onClick={() => loadTransactions(u.id)}>Voir</button>
                  <button className="btn-sm" style={{ marginLeft: 8 }} onClick={() => exportCSV(u.id)}>CSV</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUserId && (
        <div className="card">
          <h3>Transactions de {users.find(u => u.id === selectedUserId)?.name}</h3>
          {loadingTx ? <div className="loading">Chargement...</div> : (
            <table className="table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Urgence</th>
                  <th>Statut</th>
                  <th>Demandée</th>
                  <th>Livrée</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => (
                  <tr key={tx.orderId}>
                    <td>{tx.orderId.slice(0, 8)}...</td>
                    <td><span className={`badge badge-${tx.urgency}`}>{tx.urgency}</span></td>
                    <td>{tx.status}</td>
                    <td>{tx.requestedAt ? new Date(tx.requestedAt).toLocaleDateString() : '-'}</td>
                    <td>{tx.deliveredAt ? new Date(tx.deliveredAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
                {transactions.length === 0 && <tr><td colSpan={5}>Aucune transaction</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
