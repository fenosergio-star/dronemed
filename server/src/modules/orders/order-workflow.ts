import { DeliveryOrder, Drone, UrgencyLevel } from '../../../../shared/types';
import { DeliveryPriorityQueue } from '../../core/priority-queue';
import { droneSimulator } from '../fleet/drone-simulator';

const orderHistory: Map<string, DeliveryOrder> = new Map();
const orderQueue = new DeliveryPriorityQueue();

export function getOrderQueue(): DeliveryPriorityQueue { return orderQueue; }
export function getOrderHistory(): Map<string, DeliveryOrder> { return orderHistory; }

export class OrderWorkflow {
  static create(data: Partial<DeliveryOrder>): DeliveryOrder {
    const order: DeliveryOrder = {
      id: require('uuid').v4(),
      patientId: data.patientId || '',
      healthCenterId: data.healthCenterId || '',
      items: data.items || [],
      urgency: data.urgency || 'routine',
      status: 'pending',
      priorityScore: 0,
      requestedAt: new Date().toISOString(),
      notes: data.notes,
    };
    orderHistory.set(order.id, order);
    orderQueue.enqueue(order);
    return order;
  }

  static validate(orderId: string): DeliveryOrder | null {
    const order = orderHistory.get(orderId);
    if (!order || order.status !== 'pending') return null;
    order.status = 'validated';
    order.validatedAt = new Date().toISOString();
    orderQueue.updatePriority(orderId);
    return order;
  }

  static assignDrone(orderId: string, droneId: string): DeliveryOrder | null {
    const order = orderHistory.get(orderId);
    if (!order || order.status !== 'validated') return null;
    order.droneId = droneId;
    return order;
  }

  static async dispatch(
    orderId: string,
    droneId: string,
    startCoords: { lat: number; lng: number },
    endCoords: { lat: number; lng: number },
    batteryLevel: number
  ): Promise<{ success: boolean; order: DeliveryOrder | null; reason?: string }> {
    const order = orderHistory.get(orderId);
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

    order.status = 'in_transit';
    order.droneId = droneId;
    order.verificationCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    order.qrCode = `DRONEMED-${order.id.slice(0, 8)}-${order.verificationCode}`;
    orderQueue.remove(orderId);
    return { success: true, order };
  }

  static confirmDelivery(orderId: string, code: string): DeliveryOrder | null {
    const order = orderHistory.get(orderId);
    if (!order) return null;
    if (order.verificationCode !== code) return null;
    order.status = 'delivered';
    order.deliveredAt = new Date().toISOString();
    return order;
  }

  static cancel(orderId: string): DeliveryOrder | null {
    const order = orderHistory.get(orderId);
    if (!order) return null;
    order.status = 'cancelled';
    orderQueue.remove(orderId);
    return order;
  }

  static getNextMission(): DeliveryOrder | null {
    return orderQueue.peek();
  }

  static getAll(): DeliveryOrder[] {
    return Array.from(orderHistory.values());
  }

  static getById(orderId: string): DeliveryOrder | undefined {
    return orderHistory.get(orderId);
  }
}
