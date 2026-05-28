import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { InventoryPage } from './pages/InventoryPage';
import { FleetPage } from './pages/FleetPage';
import { OrdersPage } from './pages/OrdersPage';
import { MapPage } from './pages/MapPage';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/fleet" element={<FleetPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
