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
- Cobertura actual: middlewares (`autenticar`, `tenantActivo`, `requiereRol`), `lib/jwt.ts` (incluye `signMpState`/`verifyMpState`), `lib/crypto.ts`, `sync.service.ts` (resolución de tenant por `mpUserId` en el webhook de MP), y tests de integración por ruta (`auth`, `onboarding`, `productos`, `pedidos`, `caja`, `empleados`) montando el router real con `supertest` sobre una tienda fake en memoria — verifican aislamiento cruzado real (tenant A nunca puede leer/editar recursos de tenant B) y no solo "se llamó a prisma con estos args".
- Patrón para tests de ruta: `express()` + `express.json()` + el router real + `errorHandler`, autenticando con un JWT real vía `signToken(...)` (no hace falta mockear `lib/jwt`). Ver `src/routes/productos.test.ts` como referencia.
- **Gotcha real que nos pasó:** los mocks de Vitest (`vi.fn()`) NO limpian su historial de llamadas entre tests solos por reasignar `.mockImplementation()` en `beforeEach` — si algún test hace `expect(mockFn).not.toHaveBeenCalled()`, hay que además `.mockReset()`/`.mockClear()` ese mock en el `beforeEach`, o un test anterior deja falsos positivos.
- `npm run test` desde la raíz llama al workspace del backend directo (no vía `turbo run test`) — en esta máquina Windows, `turbo run test` falla en silencio por una interacción rara entre turbo y el arranque de Vitest 4/Vite; no es un problema de los tests en sí.

## Variables de entorno requeridas
Ver `../../.env.example`. Copiar a `../../.env` para desarrollo.

## Agregar una nueva ruta
1. Crear `src/routes/nombreRuta.ts`
2. Registrar en `src/server.ts` con `app.use('/api/nombre', router)`
3. Aplicar middlewares: `router.use(autenticar, tenantActivo)`
4. La lógica va en un service en `src/services/`
