import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { routingAPI } from '../services/api';
import { connectWebSocket, DroneUpdate } from '../services/websocket';

const madagascarCenter: [number, number] = [-18.7669, 46.8691];

const hospitalIcon = L.divIcon({
  html: '<div style="background:#d93025;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏥</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
});

function createDroneIcon(battery: number, status: string) {
  const color = battery < 20 ? '#d93025' : battery < 40 ? '#f9ab00' : status === 'en_route' || status === 'returning' ? '#1a73e8' : '#1e8e3e';
  return L.divIcon({
    html: `<div style="background:${color};color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;transition:all 0.5s">🚁</div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16],
  });
}

function DroneMarkers({ drones }: { drones: DroneUpdate[] }) {
  const map = useMap();
  useEffect(() => {
    if (drones.length > 0 && drones.some(d => d.status === 'en_route')) {
      const inFlight = drones.find(d => d.status === 'en_route');
      if (inFlight?.position) map.setView([inFlight.position.lat, inFlight.position.lng], map.getZoom());
    }
  }, [drones]);

  return (
    <>
      {drones.map(d => d.position && (
        <Marker key={d.id} position={[d.position.lat, d.position.lng]} icon={createDroneIcon(d.battery, d.status)}>
          <Popup>
            <strong>{d.name}</strong><br />
            🔋 {d.battery}%<br />
            📍 {d.position.lat.toFixed(4)}, {d.position.lng.toFixed(4)}<br />
            📡 {d.status}{d.hasMission ? ' ✅ Mission' : ''}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

const hospitals: { name: string; pos: [number, number]; type: string }[] = [
  { name: 'CHU Antananarivo', pos: [-18.9, 47.5], type: 'hospital' },
  { name: 'CSB Antsirabe', pos: [-19.87, 47.03], type: 'csb2' },
  { name: 'CSB Toamasina', pos: [-17.83, 48.43], type: 'csb1' },
  { name: 'CSB Fianarantsoa', pos: [-21.45, 47.09], type: 'csb2' },
  { name: 'CSB Mahajanga', pos: [-15.72, 46.32], type: 'csb1' },
  { name: 'CSB Tuléar', pos: [-23.35, 43.67], type: 'csb1' },
  { name: 'CHR Antsiranana', pos: [-12.28, 49.29], type: 'chr' },
];

export function MapPage() {
  const [drones, setDrones] = useState<DroneUpdate[]>([]);
  const [route, setRoute] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    wsRef.current = connectWebSocket(
      (drone) => setDrones(prev => prev.map(d => d.id === drone.id ? drone : d)),
      (fleet) => setDrones(fleet)
    );
    return () => wsRef.current?.close();
  }, []);

  const handleCalcRoute = async () => {
    const res = await routingAPI.findRoute({
      start: { lat: -18.9, lng: 47.5 },
      end: { lat: -19.87, lng: 47.03 },
      batteryLevel: 100, currentPayload: 2, maxPayload: 5, maxRange: 50,
    });
    const data = res.data.data;
    setRoute(data);
    setRouteInfo(`📍 ${data.distance}km | ⏱ ${data.duration}min | 🔋 ${data.batteryRequired}% | ${data.safeToFly ? '✅ Sécuritaire' : '❌ Non sécuritaire'}${data.obstacles?.length ? ' | ⚠️ ' + data.obstacles.join(', ') : ''}`);
  };

  return (
    <div>
      <div className="page-header">
        <h2>🗺️ Carte Interactive</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-info">📡 {drones.length} drone(s) connecté(s)</span>
          <button className="btn btn-primary" onClick={handleCalcRoute}>Calculer Itinéraire A*</button>
        </div>
      </div>

      <div className="card map-container">
        <MapContainer center={madagascarCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {hospitals.map(h => (
            <Marker key={h.name} position={h.pos} icon={hospitalIcon}>
              <Popup><strong>{h.name}</strong><br />{h.type}</Popup>
            </Marker>
          ))}
          <DroneMarkers drones={drones} />
          {route?.path && (
            <>
              <Polyline positions={route.path.map((p: any) => [p.lat, p.lng])} color="#1a73e8" weight={3} opacity={0.8} />
              <Marker position={[route.path[0].lat, route.path[0].lng]} icon={L.divIcon({ html: '🟢', className: '', iconSize: [20, 20] })}>
                <Popup>Départ</Popup>
              </Marker>
              <Marker position={[route.path[route.path.length - 1].lat, route.path[route.path.length - 1].lng]} icon={L.divIcon({ html: '🔴', className: '', iconSize: [20, 20] })}>
                <Popup>Arrivée</Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>

      {/* Route info */}
      {route && (
        <div className="card" style={{ marginTop: 16, borderLeft: `4px solid ${route.safeToFly ? '#1e8e3e' : '#d93025'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>📍 Résultat A*</h3>
              <p style={{ color: '#5f6368', marginTop: 4 }}>{routeInfo}</p>
              {route.obstacles?.map((o: string, i: number) => (
                <div key={i} style={{ fontSize: 13, color: '#e37400' }}>⚠️ {o}</div>
              ))}
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#5f6368' }}>
              <div>No-Fly Zones évitées</div>
              <div>Relief contourné</div>
              <div>Batterie A-R vérifiée</div>
            </div>
          </div>
        </div>
      )}

      {/* Live fleet feed */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>🚁 Positions live des drones</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
          {drones.map(d => (
            <div key={d.id} style={{
              padding: 10, borderRadius: 8, border: '1px solid #dadce0',
              background: d.status === 'en_route' ? '#e8f0fe' : d.status === 'emergency' ? '#fce8e6' : '#fff',
            }}>
              <div style={{ fontWeight: 600 }}>🚁 {d.name}</div>
              <div style={{ fontSize: 12, color: '#5f6368', fontFamily: 'monospace' }}>
                📍 {d.position ? `${d.position.lat.toFixed(4)}, ${d.position.lng.toFixed(4)}` : 'N/A'}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                🔋 {d.battery}% • 📡 {d.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
