import { Request, Response } from 'express';
import { getPool } from '../../database/postgres';

const pool = () => getPool();

export class ReportsController {
  static async userTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { userId, from, to, format } = req.query;
      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (userId) { conditions.push(`u.id = $${idx++}`); params.push(userId); }
      if (from) { conditions.push(`o.requested_at >= $${idx++}`); params.push(from); }
      if (to) { conditions.push(`o.requested_at <= $${idx++}`); params.push(to); }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

      const query = `
        SELECT u.id AS user_id, u.name AS user_name, u.email, u.role,
               o.id AS order_id, o.urgency, o.status, o.requested_at, o.delivered_at,
               o.notes
        FROM users u
        LEFT JOIN delivery_orders o ON o.created_by = u.id
        ${where}
        ORDER BY o.requested_at DESC
      `;

      const { rows } = await pool().query(query, params);

      if (format === 'csv') {
        const header = 'user_id,user_name,email,role,order_id,urgency,status,requested_at,delivered_at,notes\n';
        const csv = header + rows.map(r => [
          r.user_id, r.user_name, r.email, r.role, r.order_id, r.urgency, r.status,
          r.requested_at, r.delivered_at, `"${(r.notes || '').replace(/"/g, '""')}"`
        ].join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="rapport-transactions.csv"');
        res.send(csv);
        return;
      }

      const grouped: Record<string, any> = {};
      for (const r of rows) {
        if (!grouped[r.user_id]) {
          grouped[r.user_id] = {
            userId: r.user_id, name: r.user_name, email: r.email, role: r.role,
            transactions: [],
          };
        }
        if (r.order_id) {
          grouped[r.user_id].transactions.push({
            orderId: r.order_id,
            urgency: r.urgency,
            status: r.status,
            requestedAt: r.requested_at,
            deliveredAt: r.delivered_at,
            notes: r.notes,
          });
        }
      }

      res.json({
        success: true,
        data: Object.values(grouped),
        total: Object.keys(grouped).length,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  static async userActivityLog(req: Request, res: Response): Promise<void> {
    try {
      const { rows } = await pool().query(`
        SELECT u.id, u.name, u.email, u.role,
               COUNT(o.id)::int AS total_orders,
               COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::int AS delivered,
               COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::int AS pending,
               COUNT(CASE WHEN o.status = 'in_transit' THEN 1 END)::int AS in_transit,
               MAX(o.requested_at) AS last_activity
        FROM users u
        LEFT JOIN delivery_orders o ON o.created_by = u.id
        GROUP BY u.id, u.name, u.email, u.role
        ORDER BY last_activity DESC NULLS LAST
      `);

      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
}
