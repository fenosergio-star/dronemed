import { Request, Response } from 'express';
import { OrderWorkflow } from './order-workflow';
import { droneSimulator } from '../fleet/drone-simulator';

export class OrderWorkflowController {
  static getPending(req: Request, res: Response): void {
    const orders = OrderWorkflow.getAll().filter(o => o.status === 'pending');
    res.json({ success: true, data: orders, total: orders.length });
  }

  static getActive(req: Request, res: Response): void {
    const orders = OrderWorkflow.getAll().filter(
      o => o.status === 'validated' || o.status === 'in_transit'
    );
    res.json({ success: true, data: orders, total: orders.length });
  }

  static validate(req: Request, res: Response): void {
    const order = OrderWorkflow.validate(req.params.id);
    if (!order) {
      res.status(400).json({ success: false, error: 'Validation impossible' });
      return;
    }
    res.json({ success: true, data: order });
  }

  static assignDrone(req: Request, res: Response): void {
    const { droneId } = req.body;
    const order = OrderWorkflow.assignDrone(req.params.id, droneId);
    if (!order) {
      res.status(400).json({ success: false, error: 'Assignation impossible' });
      return;
    }
    res.json({ success: true, data: order });
  }

  static async dispatch(req: Request, res: Response): Promise<void> {
    const { droneId, startLat, startLng, endLat, endLng, batteryLevel } = req.body;
    const result = await OrderWorkflow.dispatch(
      req.params.id,
      droneId,
      { lat: startLat, lng: startLng },
      { lat: endLat, lng: endLng },
      batteryLevel || 100
    );
    if (!result.success) {
      res.status(400).json({ success: false, error: result.reason });
      return;
    }
    res.json({ success: true, data: result.order, qrCode: result.order!.qrCode });
  }

  static confirmDelivery(req: Request, res: Response): void {
    const { code } = req.body;
    const order = OrderWorkflow.confirmDelivery(req.params.id, code);
    if (!order) {
      res.status(400).json({ success: false, error: 'Code invalide ou commande introuvable' });
      return;
    }
    res.json({ success: true, data: order });
  }
}
