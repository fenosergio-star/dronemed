import { DeliveryOrder } from '../../../../shared/types';
import { DeliveryPriorityQueue } from '../../core/priority-queue';
import { droneSimulator } from '../fleet/drone-simulator';
import { OrderRepo, OrderItemRepo } from '../../database/repository';

const orderQueue = new DeliveryPriorityQueue();

export function getOrderQueue(): DeliveryPriorityQueue { return orderQueue; }

export async function loadOrdersIntoQueue(): Promise<void> {
  const orders = await OrderRepo.getAll();
  for (const o of orders) {
    if (o.status === 'pending' || o.status === 'validated') {
      orderQueue.enqueue(o);
    }
  }
}

export class OrderWorkflow {
  static async create(data: Partial<DeliveryOrder>): Promise<DeliveryOrder> {
    const order = await OrderRepo.create(data) as DeliveryOrder;
    const full = await OrderRepo.getById(order.id);
    const result = full || order;
    orderQueue.enqueue(result);
    return result;
  }

  static async validate(orderId: string): Promise<DeliveryOrder | null> {
    const order = await OrderRepo.getById(orderId);
    if (!order || order.status !== 'pending') return null;
    const updated = await OrderRepo.updateStatus(orderId, 'validated');
    orderQueue.updatePriority(orderId);
    return updated;
  }

  static async assignDrone(orderId: string, droneId: string): Promise<DeliveryOrder | null> {
    const order = await OrderRepo.getById(orderId);
    if (!order || order.status !== 'validated') return null;
    return OrderRepo.update(orderId, { drone_id: droneId });
  }

  static async dispatch(
    orderId: string,
    droneId: string,
    startCoords: { lat: number; lng: number },
    endCoords: { lat: number; lng: number },
    batteryLevel: number
  ): Promise<{ success: boolean; order: DeliveryOrder | null; reason?: string }> {
    const order = await OrderRepo.getById(orderId);
    if (!order) return { success: false, order: null, reason: 'Commande introuvable' };
    if (order.status !== 'validated') {
      return { success: false, order: null, reason: 'Commande non validée' };
    }

    const launched = await droneSimulator.startMission(
      droneId, orderId, startCoords, endCoords, batteryLevel
    );

    if (!launched) {
      return { success: false, order: null, reason: 'Échec lancement (batterie insuffisante ou chemin non trouvé)' };
    }

    const verificationCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const qrCode = `DRONEMED-${orderId.slice(0, 8)}-${verificationCode}`;

    const updated = await OrderRepo.update(orderId, {
      status: 'in_transit',
      drone_id: droneId,
      verification_code: verificationCode,
      qr_code: qrCode,
    });

    orderQueue.remove(orderId);
    return { success: true, order: updated };
  }

  static async confirmDelivery(orderId: string, code: string): Promise<DeliveryOrder | null> {
    const order = await OrderRepo.getById(orderId);
    if (!order) return null;
    if (order.verificationCode !== code) return null;
    const updated = await OrderRepo.updateStatus(orderId, 'delivered');
    return updated;
  }

  static async cancel(orderId: string): Promise<DeliveryOrder | null> {
    const order = await OrderRepo.getById(orderId);
    if (!order) return null;
    const updated = await OrderRepo.updateStatus(orderId, 'cancelled');
    orderQueue.remove(orderId);
    return updated;
  }

  static getNextMission(): DeliveryOrder | null {
    return orderQueue.peek();
  }

  static async getAll(): Promise<DeliveryOrder[]> {
    return OrderRepo.getAll();
  }

  static async getById(orderId: string): Promise<DeliveryOrder | null> {
    return OrderRepo.getById(orderId);
  }

  static async getByStatus(status: string): Promise<DeliveryOrder[]> {
    return OrderRepo.getByStatus(status);
  }
}
