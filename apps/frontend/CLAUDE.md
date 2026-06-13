# Frontend — Cafeteria SaaS

## Tecnologías
Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Socket.io-client

## Puerto
3000 en desarrollo (`npm run dev`)

## Estructura de rutas
```
app/
  page.tsx                  landing pública
  (onboarding)/             grupo sin layout del dashboard
    registro/               paso 1 — crear cuenta
    menu/                   paso 2 — productos iniciales
    conectar-mp/            paso 3 — OAuth MP
  (dashboard)/              grupo con sidebar de navegación
    page.tsx                métricas del día
    pos/                    POS con soporte offline
    cocina/                 pantalla en tiempo real (WebSocket)
    pedidos/                lista de pedidos
    productos/              ABM productos
    empleados/              ABM empleados
    caja/                   movimientos de caja
```

## Patrones establecidos
- `api.ts` — todas las llamadas HTTP pasan por aquí (inyecta token automáticamente)
- `db-local.ts` — IndexedDB para modo offline (idb)
- `pedido.store.ts` — Zustand para carrito y pedidos en tiempo real
- `useConexion` — detecta online/offline para saber si usar API o IndexedDB
- `useSocket` — conexión Socket.io (conecta solo una vez, limpia al desmontar)
- `usePedidos` — abstracción que combina API + IndexedDB según conexión

## Variables de entorno
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Comandos
```bash
npm run dev       # Next.js en modo desarrollo con hot reload
npm run typecheck # verificar tipos
npm run build     # build de producción
```

## Agregar una nueva página al dashboard
1. Crear `src/app/(dashboard)/nombre/page.tsx`
2. Agregar el link al array `NAV` en `(dashboard)/layout.tsx`
3. Si necesita datos del servidor, agregar `useEffect` con `api.get()`
