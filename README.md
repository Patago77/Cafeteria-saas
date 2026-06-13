# Cafetería SaaS

Sistema de gestión multi-tenant para cafeterías en Argentina.

## Stack
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: Next.js 14 App Router + Tailwind + Zustand
- **Pagos**: Mercado Pago OAuth por tenant
- **Tiempo real**: Socket.io
- **Offline**: IndexedDB + PWA

## Inicio rápido

### 1. Requisitos previos
- Node.js 20+
- Docker Desktop

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 4. Levantar base de datos
```bash
npm run docker:up
```

### 5. Aplicar migraciones
```bash
npm run db:migrate
```

### 6. Desarrollar
```bash
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- Prisma Studio: `npm run db:studio`

## Estructura
```
cafeteria-saas/
  apps/
    backend/   Node.js + Express (puerto 3001)
    frontend/  Next.js 14 (puerto 3000)
  packages/
    types/     Tipos TypeScript compartidos
    utils/     Utilidades compartidas
  docker/      Configuración Docker
```
