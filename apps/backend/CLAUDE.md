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
npm run db:migrate   # prisma migrate dev
npm run db:studio    # UI visual Prisma
npm run typecheck    # verificar tipos sin compilar
```

## Variables de entorno requeridas
Ver `../../.env.example`. Copiar a `../../.env` para desarrollo.

## Agregar una nueva ruta
1. Crear `src/routes/nombreRuta.ts`
2. Registrar en `src/server.ts` con `app.use('/api/nombre', router)`
3. Aplicar middlewares: `router.use(autenticar, tenantActivo)`
4. La lógica va en un service en `src/services/`
