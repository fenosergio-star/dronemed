export type DroneUpdate = {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  battery: number;
  status: string;
  hasMission?: boolean;
};

export type WsMessage =
  | { type: 'drone:update'; drone: DroneUpdate }
  | { type: 'fleet:snapshot'; drones: DroneUpdate[] };

export function connectWebSocket(
  onDroneUpdate: (drone: DroneUpdate) => void,
  onFleetSnapshot: (drones: DroneUpdate[]) => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  const port = '3000';
  const ws = new WebSocket(`${protocol}//${host}:${port}/ws`);

  ws.onopen = () => console.log('[WS] Connecté');
  ws.onmessage = (event) => {
    try {
      const msg: WsMessage = JSON.parse(event.data);
      if (msg.type === 'drone:update') onDroneUpdate(msg.drone);
      if (msg.type === 'fleet:snapshot') onFleetSnapshot(msg.drones);
    } catch (e) { /* ignore parse errors */ }
  };
  ws.onclose = () => {
    console.log('[WS] Déconnecté, reconnexion dans 5s');
    setTimeout(() => connectWebSocket(onDroneUpdate, onFleetSnapshot), 5000);
  };
  ws.onerror = () => ws.close();
  return ws;
}
