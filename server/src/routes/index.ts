import { Router } from 'express';
import { InventoryController } from '../modules/inventory/inventory.controller';
import { MedicationController } from '../modules/inventory/medication.controller';
import { FleetController } from '../modules/fleet/fleet.controller';
import { RoutingController } from '../modules/routing/routing.controller';
import { OrdersController } from '../modules/orders/orders.controller';
import { StatisticsController } from '../modules/orders/statistics.controller';
import { OrderWorkflowController } from '../modules/orders/workflow.controller';
import { SyncController } from '../modules/sync/sync.controller';
import { AuthController } from '../modules/auth/auth.controller';
import { ReportsController } from '../modules/reports/reports.controller';
import { jwtAuth } from '../middleware/auth';

const router = Router();
const api = Router();

// ─── Inventory (AVL Tree) ──────────────────────────
api.get('/inventory', InventoryController.getAll);
api.get('/inventory/expiring', InventoryController.getExpiringSoon);
api.get('/inventory/expired', InventoryController.getExpired);
api.get('/inventory/alerts', InventoryController.getAlerts);
api.get('/inventory/rotate', InventoryController.rotateStock);
api.get('/inventory/:id', InventoryController.getItem);
api.post('/inventory', InventoryController.addItem);
api.delete('/inventory/:id', InventoryController.removeItem);

// ─── Medications (Catalogue) ────────────────────
api.get('/medications', MedicationController.getAll);
api.get('/medications/:id', MedicationController.getById);
api.post('/medications', jwtAuth, MedicationController.create);
api.put('/medications/:id', jwtAuth, MedicationController.update);
api.delete('/medications/:id', jwtAuth, MedicationController.remove);

// ─── Fleet (Drones) ────────────────────────────────
api.get('/fleet', FleetController.getAll);
api.get('/fleet/available', FleetController.getAvailable);
api.get('/fleet/live', FleetController.getLiveStatus);
api.get('/fleet/simulated', FleetController.getSimulated);
api.get('/fleet/:id', FleetController.getById);
api.get('/fleet/:id/battery', FleetController.getBatteryStatus);
api.post('/fleet', FleetController.register);
api.patch('/fleet/:id/status', FleetController.updateStatus);
api.post('/fleet/:id/charge', FleetController.charge);
api.post('/fleet/:id/maintenance', FleetController.maintenance);

// ─── Routing (A*) ──────────────────────────────────
api.post('/routing/find', RoutingController.findRoute);
api.post('/routing/check-battery', RoutingController.checkBattery);
api.post('/routing/estimate-time', RoutingController.getEstimatedTime);
api.post('/routing/no-fly-zone', RoutingController.addNoFlyZone);

// ─── Orders (Priority Queue + Workflow) ────────────
api.get('/orders', OrdersController.getAll);
api.get('/orders/queue', OrdersController.getPriorityQueue);
api.get('/orders/next', OrdersController.getNextMission);
api.get('/orders/urgent', OrdersController.getUrgentOrders);
api.get('/orders/pending', OrderWorkflowController.getPending);
api.get('/orders/active', OrderWorkflowController.getActive);
api.get('/orders/:id', OrdersController.getById);
api.post('/orders', OrdersController.create);
api.post('/orders/process-next', OrdersController.processNext);
api.post('/orders/:id/validate', OrderWorkflowController.validate);
api.post('/orders/:id/assign', OrderWorkflowController.assignDrone);
api.post('/orders/:id/dispatch', OrderWorkflowController.dispatch);
api.post('/orders/:id/confirm', OrderWorkflowController.confirmDelivery);
api.patch('/orders/:id/urgency', OrdersController.updateUrgency);
api.patch('/orders/:id/status', OrdersController.updateStatus);
api.delete('/orders/:id', OrdersController.cancel);

// ─── Statistics ────────────────────────────────────
api.get('/stats/dashboard', StatisticsController.getDashboard);
api.get('/stats/delivery-times', StatisticsController.getDeliveryTimes);
api.get('/stats/fleet', StatisticsController.getFleetStats);
api.get('/stats/inventory', StatisticsController.getInventoryAlerts);

// ─── Sync (Mobile Offline) ─────────────────────────
api.post('/sync/push', SyncController.pushFromMobile);
api.get('/sync/pull', SyncController.pullForMobile);
api.get('/sync/devices', SyncController.getDeviceStatus);
api.get('/sync/stats', SyncController.getSyncStats);

// ─── Auth ──────────────────────────────────────────
api.post('/auth/register', AuthController.register);
api.post('/auth/login', AuthController.login);
api.get('/auth/me', jwtAuth, AuthController.me);

// ─── Reports ───────────────────────────────────────
api.get('/reports/user-transactions', jwtAuth, ReportsController.userTransactions);
api.get('/reports/user-activity', jwtAuth, ReportsController.userActivityLog);

// ─── Health ────────────────────────────────────────
api.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    project: 'DroneMed Madagascar 2035',
  });
});

router.use('/api/v1', api);

export default router;
