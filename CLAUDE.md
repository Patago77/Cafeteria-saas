# Cafeteria SaaS — Contexto global del proyecto

## Qué es esto
SaaS multi-tenant para gestión de cafeterías en Argentina.
Una instancia del sistema sirve a múltiples cafeterías (tenants).
Cada cafetería tiene su propia configuración, empleados, productos y caja de Mercado Pago.

## Stack
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: Next.js 14 App Router + Tailwind + shadcn/ui + Zustand
- **Pagos**: Mercado Pago OAuth por tenant (cada cafetería conecta su propia cuenta MP)
- **Tiempo real**: Socket.io (pantalla de cocina, estado de pedidos)
- **Offline**: IndexedDB + PWA / Service Worker (POS funciona sin internet)
- **Monorepo**: Turborepo + npm workspaces

## Estructura del repo
```
cafeteria-saas/
  apps/
    backend/    Node.js + Express (puerto 3001)
    frontend/   Next.js 14 (puerto 3000)
  packages/
    types/      Tipos TypeScript compartidos
    utils/      Utilidades compartidas
```

## Reglas críticas — SIEMPRE aplicar
1. **Multi-tenancy**: SIEMPRE filtrar por `tenantId` en TODAS las queries de DB
2. **Tokens MP**: NUNCA guardar `mpAccessToken` en texto plano — usar `encryptToken()` de `crypto.ts`
3. **tenantId en JWT**: El `tenantId` viene del JWT, NUNCA del body del request (previene tenant hopping)
4. **Middlewares en orden**: todas las rutas del dashboard usan `autenticar → tenantActivo → (roles)`
5. **Webhooks MP**: responder HTTP 200 inmediato, procesar async con `sync.service.ts`
6. **Offline POS**: guardar pedidos en IndexedDB, encolar en `cola_sync` para sincronizar al reconectar

## Modelos principales (Prisma — fuente de verdad en `apps/backend/prisma/schema.prisma`)
- `Tenant` — la cafetería (plan, estado, mpAccessToken encriptado)
- `Usuario` — empleados con rol: `admin | cajero | mozo`
- `Pedido` — con `items[]`, `estado`, `estadoPago`, `mesa`, `tenantId`
- `Producto` — precio, stock, categoría, activo, `tenantId`
- `Caja` — punto de venta físico con QR de MP, `tenantId`
- `MovimientoCaja` — apertura/cierre/retiro de caja

## Flujo de onboarding
1. `POST /api/auth/registro` — crea Tenant + Usuario admin
2. `GET /onboarding/menu` — configura productos iniciales
3. `GET /onboarding/conectar-mp` — OAuth con Mercado Pago

## Comandos útiles
```bash
npm run dev              # levanta backend (3001) y frontend (3000)
npm run db:migrate       # aplica migraciones Prisma
npm run db:studio        # UI visual de la DB
npm run docker:up        # levanta Postgres en Docker
```

## Patrones de código establecidos
- **Auth**: JWT en header `Authorization: Bearer {token}`
- **Errores**: siempre `{ error: string, code?: string }` con HTTP status apropiado
- **Validación**: Zod en backend, en el boundary de entrada (rutas)
- **Servicios**: lógica de negocio en `services/`, los controllers son delgados
- **Tipos compartidos**: importar desde `@cafeteria-saas/types`

## Variables de entorno
Ver `.env.example` en la raíz del proyecto.
