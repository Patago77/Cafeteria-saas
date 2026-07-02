import { Router } from 'express';
import { SyncService } from '../services/sync.service';

const router = Router();

// POST /api/webhooks/mercadopago — recibe notificaciones de pago de MP
// Responder 200 inmediato y procesar async (regla crítica)
router.post('/mercadopago', (req, res) => {
  res.status(200).end();
  const { type, data, user_id } = req.body as {
    type: string;
    data: { id: string };
    user_id?: string | number;
  };
  if (type === 'payment' && user_id != null) {
    SyncService.procesarPagoMP(data.id, String(user_id)).catch(console.error);
  }
});

export default router;
