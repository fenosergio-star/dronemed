import { Request, Response } from 'express';
import { UrgencyLevel } from '../../../../shared/types';
import { OrderWorkflow, getOrderQueue } from './order-workflow';

export class OrdersController {
  static async create(req: Request, res: Response): Promise<void> {
    const order = await OrderWorkflow.create(req.body);
    res.status(201).json({ success: true, data: order });
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    const orders = await OrderWorkflow.getAll();
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

  static async processNext(req: Request, res: Response): Promise<void> {
    const order = getOrderQueue().dequeue();
    if (!order) { res.json({ success: false, message: "File d'attente vide" }); return; }
    await OrderWorkflow.validate(order.id);
    res.json({ success: true, data: await OrderWorkflow.getById(order.id) });
  }

  static updateUrgency(req: Request, res: Response): void {
    const { urgency } = req.body as { urgency: UrgencyLevel };
    getOrderQueue().updatePriority(req.params.id, urgency);
    res.json({ success: true, message: 'Priorité mise à jour' });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const order = await OrderWorkflow.getById(req.params.id);
    if (!order) { res.status(404).json({ success: false, error: 'Commande non trouvée' }); return; }
    res.json({ success: true, data: order });
  }

  static async cancel(req: Request, res: Response): Promise<void> {
    const order = await OrderWorkflow.cancel(req.params.id);
    res.json({ success: !!order, data: order });
  }

  static getUrgentOrders(req: Request, res: Response): void {
    const minScore = parseInt(req.query.minPriority as string) || 50;
    const urgent = getOrderQueue().getUrgentOrders(minScore);
    res.json({ success: true, data: urgent, total: urgent.length });
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    const { status, droneId } = req.body;
    const data: any = {};
    if (status) data.status = status;
    if (droneId) data.drone_id = droneId;
    const order = await OrderWorkflow.getById(req.params.id);
    if (!order) { res.status(404).json({ success: false, error: 'Non trouvé' }); return; }
    const updated = await OrderWorkflow.getById(req.params.id);
    res.json({ success: true, data: updated });
  }
}
