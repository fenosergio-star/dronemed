import { Request, Response } from 'express';
import { OrderRepo } from '../../database/repository';

export class StatisticsController {
  static async getDashboard(req: Request, res: Response): Promise<void> {
    const orders = await OrderRepo.getAll();
    const total = orders.length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const inTransit = orders.filter(o => o.status === 'in_transit').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const validated = orders.filter(o => o.status === 'validated').length;

    const byUrgency = {
      critique: orders.filter(o => o.urgency === 'critique').length,
      vitale: orders.filter(o => o.urgency === 'vitale').length,
      urgent: orders.filter(o => o.urgency === 'urgent').length,
      routine: orders.filter(o => o.urgency === 'routine').length,
    };

    const avgDeliveryTime = delivered > 0
      ? orders
          .filter(o => o.status === 'delivered' && o.deliveredAt && o.validatedAt)
          .reduce((sum, o) => {
            const diff = new Date(o.deliveredAt!).getTime() - new Date(o.validatedAt!).getTime();
            return sum + diff / 60000;
          }, 0) / delivered
      : 0;

    const ordersByDay: Record<string, number> = {};
    orders.forEach(o => {
      const day = new Date(o.requestedAt).toISOString().slice(0, 10);
      ordersByDay[day] = (ordersByDay[day] || 0) + 1;
    });

    const monthlyTrend = Object.entries(ordersByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));

    const completionRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        overview: { total, delivered, inTransit, pending, cancelled, validated },
        byUrgency,
        avgDeliveryTime: Math.round(avgDeliveryTime * 100) / 100,
        completionRate,
        monthlyTrend,
      },
    });
  }

  static async getDeliveryTimes(req: Request, res: Response): Promise<void> {
    const orders = (await OrderRepo.getAll()).filter(
      o => o.status === 'delivered' && o.deliveredAt && o.requestedAt
    );

    const times = orders.map(o => ({
      id: o.id,
      urgency: o.urgency,
      totalMinutes: Math.round(
        (new Date(o.deliveredAt!).getTime() - new Date(o.requestedAt).getTime()) / 60000
      ),
    }));

    const byUrgency: Record<string, typeof times> = {
      critique: times.filter(t => t.urgency === 'critique'),
      vitale: times.filter(t => t.urgency === 'vitale'),
      urgent: times.filter(t => t.urgency === 'urgent'),
      routine: times.filter(t => t.urgency === 'routine'),
    };

    const averages: Record<string, number> = {};
    for (const [key, vals] of Object.entries(byUrgency)) {
      averages[key] = vals.length > 0
        ? Math.round(vals.reduce((s, t) => s + t.totalMinutes, 0) / vals.length)
        : 0;
    }

    res.json({ success: true, data: { times, averages } });
  }

  static async getFleetStats(req: Request, res: Response): Promise<void> {
    const orders = await OrderRepo.getAll();
    const droneUsage: Record<string, number> = {};
    orders.filter(o => o.droneId).forEach(o => {
      droneUsage[o.droneId!] = (droneUsage[o.droneId!] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        droneUsage,
        mostUsedDrone: Object.entries(droneUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
        missionsPerDrone: Object.keys(droneUsage).length,
      },
    });
  }

  static getInventoryAlerts(_req: Request, res: Response): void {
    res.json({
      success: true,
      data: {
        totalProducts: 0,
        expiringSoon: 0,
        expired: 0,
        alerts: [],
        recommendations: [
          "Vérifier les stocks de vaccins antirabiques dans les régions à forte densité canine",
          "Augmenter le stock d'Artésunate en saison des pluies (paludisme)",
          "Prévoir des poches de sang O- dans les CSB2 isolés",
        ],
      },
    });
  }
}
