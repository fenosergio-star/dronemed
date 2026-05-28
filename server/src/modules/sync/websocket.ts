import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { droneSimulator, SimulatedDrone } from '../fleet/drone-simulator';

let wss: WebSocketServer;

export function initWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: 'welcome', message: 'DroneMed WebSocket connecté' }));

    const onDroneUpdate = (drone: SimulatedDrone) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'drone:update',
          drone: {
            id: drone.id,
            name: drone.name,
            position: drone.position,
            battery: Math.round(drone.battery),
            status: drone.status,
          },
        }));
      }
    };

    droneSimulator.onPosition(onDroneUpdate);

    ws.on('close', () => {
      droneSimulator.removeListener(onDroneUpdate);
    });
  });

  setInterval(() => {
    const drones = droneSimulator.getAllDrones().map(d => ({
      id: d.id, name: d.name,
      position: d.position,
      battery: Math.round(d.battery),
      status: d.status,
      hasMission: !!d.mission,
    }));
    const payload = JSON.stringify({ type: 'fleet:snapshot', drones });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
  }, 5000);

  console.log('[WS] Serveur WebSocket prêt sur /ws');
  return wss;
}

export function getWSS(): WebSocketServer {
  return wss;
}
