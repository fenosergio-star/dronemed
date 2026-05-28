import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import routes from './routes';
import { initWebSocket } from './modules/sync/websocket';
import { droneSimulator } from './modules/fleet/drone-simulator';
import { initPostgres } from './database/postgres';
import { DroneRepo } from './database/repository';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const server = createServer(app);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use(routes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

initWebSocket(server);

async function start() {
  try {
    await initPostgres();
    const drones = await DroneRepo.getAll();
    for (const d of drones) {
      droneSimulator.registerDrone(d.id, d.name, {
        lat: d.currentLat || -18.7669,
        lng: d.currentLng || 46.8691,
      });
    }
    console.log(`[Simulator] ${drones.length} drones chargés`);
  } catch (err) {
    console.warn('[PostgreSQL] Non disponible, démarrage sans persistance:', (err as Error).message);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   DroneMed Madagascar 2035 - Server     ║
  ║   🚁 API  → http://0.0.0.0:${PORT}         ║
  ║   📡 WS   → ws://0.0.0.0:${PORT}/ws       ║
  ╚══════════════════════════════════════════╝
    `);
  });
}

start();

export default app;
