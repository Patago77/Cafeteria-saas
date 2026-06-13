import { Router } from 'express';
import { SyncService } from '../services/sync.service';

const router = Router();

// POST /api/webhooks/mercadopago — recibe notificaciones de pago de MP
// Responder 200 inmediato y procesar async (regla crítica)
router.post('/mercadopago', (req, res) => {
  res.status(200).end();
  const { type, data } = req.body as { type: string; data: { id: string } };
  if (type === 'payment') {
    SyncService.procesarPagoMP(data.id).catch(console.error);
  }
});

export default router;
