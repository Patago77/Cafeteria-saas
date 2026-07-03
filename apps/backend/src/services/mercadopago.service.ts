import { prisma } from '../lib/prisma';
import { decryptToken } from '../lib/crypto';

interface PreferenciaMP {
  init_point?: string;
  sandbox_init_point?: string;
}

export class MercadoPagoService {
  private static async getAccessToken(tenantId: string): Promise<string> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mpAccessToken: true },
    });
    if (!tenant?.mpAccessToken) throw new Error('Mercado Pago no conectado', { cause: 'MP_NOT_CONNECTED' });
    return decryptToken(tenant.mpAccessToken);
  }

  static async crearPreferencia(
    tenantId: string,
    pedidoId: string,
    items: Array<{ title: string; unit_price: number; quantity: number }>
  ): Promise<PreferenciaMP> {
    const accessToken = await this.getAccessToken(tenantId);
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        external_reference: pedidoId,
        notification_url: `${process.env.BASE_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pos/pago-exitoso`,
          failure: `${process.env.FRONTEND_URL}/pos/pago-fallido`,
        },
      }),
    });
    if (!response.ok) throw new Error('Error creando preferencia MP');
    return response.json() as Promise<PreferenciaMP>;
  }
}
