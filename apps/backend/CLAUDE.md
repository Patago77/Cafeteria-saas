# Backend — Cafeteria SaaS

## Tecnologías
Node.js + Express + TypeScript + Prisma + PostgreSQL + Socket.io

## Puerto
3001 en desarrollo (`npm run dev`)

## Estructura
```
src/
  routes/       controladores HTTP delgados — solo parsean y llaman services
  middlewares/  auth → tenantActivo → roles (en ese orden)
  services/     lógica de negocio
  lib/          jwt, crypto, socket, prisma (instancias singleton)
prisma/
  schema.prisma fuente de verdad del modelo de datos
```

## Reglas críticas
1. Toda query de Prisma incluye `where: { tenantId }` — sin excepción
2. `encryptToken` / `decryptToken` de `lib/crypto.ts` para tokens de MP
3. `tenantId` siempre del JWT, nunca del `req.body`
4. Webhooks de MP: responder 200 inmediato, procesar con `SyncService` async
5. Errores de validación Zod se propagan con el shape `{ error, issues? }`

## Comandos
```bash
npm run dev          # ts-node-dev con hot reload
npm run test         # Vitest (src/**/*.test.ts, mocks de prisma/crypto/socket — no toca la DB real)
npm run test:watch   # Vitest en modo watch
npm run db:migrate   # prisma migrate dev
npm run db:studio    # UI visual Prisma
npm run typecheck    # verificar tipos sin compilar
```

## Tests
- Framework: Vitest (`vitest.config.ts`). Nada de tests toca la DB real — se mockea `../lib/prisma`, `../lib/crypto`, `../lib/socket` con `vi.mock` (usar `vi.hoisted()` para las funciones mock referenciadas dentro del factory).
- `JWT_SECRET` y `ENCRYPTION_KEY` de test están fijados en `vitest.config.ts` (`test.env`), no dependen del `.env` real.
- Cobertura actual: middlewares (`autenticar`, `tenantActivo`, `requiereRol`), `lib/jwt.ts` (incluye `signMpState`/`verifyMpState`), `lib/crypto.ts`, `sync.service.ts` (resolución de tenant por `mpUserId` en el webhook de MP), `email.service.ts` (modo mock sin SMTP vs. envío real mockeando `nodemailer`), y tests de integración por ruta (`auth`, `onboarding`, `productos`, `pedidos` incluyendo `/metricas`, `caja`, `empleados`) montando el router real con `supertest` sobre una tienda fake en memoria — verifican aislamiento cruzado real (tenant A nunca puede leer/editar recursos de tenant B) y no solo "se llamó a prisma con estos args".
- Patrón para tests de ruta: `express()` + `express.json()` + el router real + `errorHandler`, autenticando con un JWT real vía `signToken(...)` (no hace falta mockear `lib/jwt`). Ver `src/routes/productos.test.ts` como referencia.
- **Gotcha real que nos pasó:** los mocks de Vitest (`vi.fn()`) NO limpian su historial de llamadas entre tests solos por reasignar `.mockImplementation()` en `beforeEach` — si algún test hace `expect(mockFn).not.toHaveBeenCalled()`, hay que además `.mockReset()`/`.mockClear()` ese mock en el `beforeEach`, o un test anterior deja falsos positivos.
- `npm run test` desde la raíz llama al workspace del backend directo (no vía `turbo run test`) — en esta máquina Windows, `turbo run test` falla en silencio por una interacción rara entre turbo y el arranque de Vitest 4/Vite; no es un problema de los tests en sí.

## Cobro de pedidos
- `POST /api/pedidos` intenta crear una preferencia de Mercado Pago (`MercadoPagoService.crearPreferencia`) y devuelve `mpInitPoint` (el link de pago) en la respuesta si el tenant tiene MP conectado. Si no está conectado o falla la llamada, `mpInitPoint` es `null` y el pedido se crea igual — el cobro por MP es opcional, nunca bloquea la creación del pedido.
- `PATCH /api/pedidos/:id/pago` (`admin`/`cajero`) marca `estadoPago` a mano (`pendiente`/`pagado`/`reembolsado`) — es el camino para efectivo/transferencia u otros medios que no pasan por MP.
- Antes de esto, `estadoPago` solo se podía volver `pagado` vía el webhook de MP — si un tenant no tenía MP conectado, ningún pedido podía marcarse como pagado nunca. Si se toca este flujo de nuevo, tener en cuenta que son dos caminos independientes hacia el mismo campo.

## Email (`email.service.ts`)
- Usa `nodemailer`. Si `SMTP_HOST` no está seteado en el entorno, `EmailService.send` no manda nada de verdad — solo loguea `[Email mock] ...` a consola (modo dev sin credenciales).
- Con `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`EMAIL_FROM` seteados en `.env`, manda el mail real. **Las credenciales del proveedor SMTP las tiene que conseguir/configurar el usuario** (Gmail app password, SendGrid, Resend, Mailgun, etc.) — el código ya está listo para cualquiera de esos, no hace falta tocar `email.service.ts` de nuevo.
- `EmailService.bienvenida()` se dispara en `POST /api/auth/registro` (fire-and-forget con `.catch(console.error)` — un fallo de email nunca debe romper el registro).

## Variables de entorno requeridas
Ver `../../.env.example`. Copiar a `../../.env` para desarrollo.

## Agregar una nueva ruta
1. Crear `src/routes/nombreRuta.ts`
2. Registrar en `src/server.ts` con `app.use('/api/nombre', router)`
3. Aplicar middlewares: `router.use(autenticar, tenantActivo)`
4. La lógica va en un service en `src/services/`
