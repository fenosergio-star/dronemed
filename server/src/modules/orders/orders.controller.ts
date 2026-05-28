import { Request, Response } from 'express';
import { DeliveryOrder, UrgencyLevel } from '../../../../shared/types';
import { OrderWorkflow, getOrderQueue, getOrderHistory } from './order-workflow';

export class OrdersController {
  static create(req: Request, res: Response): void {
    const order = OrderWorkflow.create(req.body);
    res.status(201).json({ success: true, data: order });
  }

  static getAll(req: Request, res: Response): void {
    const orders = OrderWorkflow.getAll();
    res.json({ success: true, data: orders, total: orders.length });
  }

  static getPriorityQueue(req: Request, res: Response): void {
    const orders = getOrderQueue().getAll();
    res.json({ success: true, data: orders, total: orders.length });
  }

  static getNextMission(req: Request, res: Response): void {
    const next = getOrderQueue().getNextMission();
    if (!next) { res.json({ success: true, data: null, message: 'Aucune mission en attente' }); return; }
    res.json({ success: true, data: next });
  }

  static processNext(req: Request, res: Response): void {
    const order = getOrderQueue().dequeue();
    if (!order) { res.json({ success: false, message: 'File d\'attente vide' }); return; }
    OrderWorkflow.validate(order.id);
    res.json({ success: true, data: OrderWorkflow.getById(order.id) });
  }

  static updateUrgency(req: Request, res: Response): void {
    const { urgency } = req.body as { urgency: UrgencyLevel };
    getOrderQueue().updatePriority(req.params.id, urgency);
    res.json({ success: true, message: 'Priorité mise à jour' });
  }

  static getById(req: Request, res: Response): void {
    const order = OrderWorkflow.getById(req.params.id);
    if (!order) { res.status(404).json({ success: false, error: 'Commande non trouvée' }); return; }
    res.json({ success: true, data: order });
  }

  static cancel(req: Request, res: Response): void {
    const order = OrderWorkflow.cancel(req.params.id);
    res.json({ success: !!order, data: order });
  }

  static getUrgentOrders(req: Request, res: Response): void {
    const minScore = parseInt(req.query.minPriority as string) || 50;
    const urgent = getOrderQueue().getUrgentOrders(minScore);
    res.json({ success: true, data: urgent, total: urgent.length });
  }

  static updateStatus(req: Request, res: Response): void {
    const order = getOrderHistory().get(req.params.id);
    if (!order) { res.status(404).json({ success: false, error: 'Non trouvé' }); return; }
    const { status, droneId } = req.body;
    if (status) order.status = status;
    if (droneId) order.droneId = droneId;
    if (status === 'delivered') order.deliveredAt = new Date().toISOString();
    res.json({ success: true, data: order });
  }
}
