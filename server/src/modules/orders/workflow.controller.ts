import { Request, Response } from 'express';
import { OrderWorkflow } from './order-workflow';

export class OrderWorkflowController {
  static async getPending(req: Request, res: Response): Promise<void> {
    const orders = await OrderWorkflow.getByStatus('pending');
    res.json({ success: true, data: orders, total: orders.length });
  }

  static async getActive(req: Request, res: Response): Promise<void> {
    const all = await OrderWorkflow.getAll();
    const orders = all.filter(o => o.status === 'validated' || o.status === 'in_transit');
    res.json({ success: true, data: orders, total: orders.length });
  }

  static async validate(req: Request, res: Response): Promise<void> {
    const order = await OrderWorkflow.validate(req.params.id);
    if (!order) {
      res.status(400).json({ success: false, error: 'Validation impossible' });
      return;
    }
    res.json({ success: true, data: order });
  }

  static async assignDrone(req: Request, res: Response): Promise<void> {
    const { droneId } = req.body;
    const order = await OrderWorkflow.assignDrone(req.params.id, droneId);
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

  static async confirmDelivery(req: Request, res: Response): Promise<void> {
    const { code } = req.body;
    const order = await OrderWorkflow.confirmDelivery(req.params.id, code);
    if (!order) {
      res.status(400).json({ success: false, error: 'Code invalide ou commande introuvable' });
      return;
    }
    res.json({ success: true, data: order });
  }
}
