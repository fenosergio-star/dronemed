import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import routes from './routes';
import { initWebSocket } from './modules/sync/websocket';
import { droneSimulator } from './modules/fleet/drone-simulator';

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

droneSimulator.registerDrone('alpha-01', 'Drone-Alpha', { lat: -18.7669, lng: 46.8691 });
droneSimulator.registerDrone('beta-02', 'Drone-Beta', { lat: -19.8729, lng: 47.0338 });
droneSimulator.registerDrone('gamma-03', 'Drone-Gamma', { lat: -17.8293, lng: 48.4335 });
droneSimulator.registerDrone('delta-04', 'Drone-Delta', { lat: -20.2604, lng: 47.3462 });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   DroneMed Madagascar 2035 - Server     ║
  ║   🚁 API  → http://0.0.0.0:${PORT}         ║
  ║   📡 WS   → ws://0.0.0.0:${PORT}/ws       ║
  ╚══════════════════════════════════════════╝
  `);
});

export default app;
