# Frontend — Cafeteria SaaS

## Tecnologías
Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS + Zustand + Socket.io-client
(Nota: no hay shadcn/ui instalado todavía — ni `components/ui/`, ni `@radix-ui/*` — pese a que se mencionaba antes acá. Sí están `cva`/`clsx`/`tailwind-merge`, los building blocks, pero sin componentes generados.)

## Puerto
3000 en desarrollo (`npm run dev`, puede variar según `.env.local`)

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
- Cobro: al confirmar un pedido en `pos/`, si la respuesta trae `mpInitPoint` se muestra un link "Cobrar con Mercado Pago" (puede venir `null` si el tenant no conectó MP). En `pedidos/`, el botón "Marcar pagado" (`usePedidos().marcarPago`) cubre efectivo/otros medios.

## Variables de entorno
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Comandos
```bash
npm run dev       # Next.js en modo desarrollo con hot reload
npm run test      # Vitest + Testing Library + jsdom
npm run test:watch
npm run typecheck # verificar tipos
npm run build     # build de producción
```

## Tests
- Framework: Vitest (`vitest.config.ts`), entorno `jsdom`, alias `@/*` configurado igual que en `tsconfig.json`.
- `vitest.setup.ts` carga `@testing-library/jest-dom` y `fake-indexeddb/auto` (IndexedDB fake global, necesario porque jsdom no lo implementa).
- Cobertura actual: `stores/pedido.store.ts`, `hooks/useConexion.ts`, `hooks/usePedidos.ts`, `hooks/useSocket.ts`, `lib/api.ts`, `lib/db-local.ts` (con `fake-indexeddb`), y tests de componente de `dashboard`, `cocina`, `pos`, `pedidos`, `onboarding/login`, `onboarding/registro` (mockeando `@/lib/api` y, según el caso, `@/hooks/useSocket`/`@/lib/notificaciones`/`next/navigation`).
- **Gotcha real que nos costó tiempo (React duplicado):** el monorepo tenía DOS copias de React instaladas (una v18 hoisteada a la raíz por `@testing-library/react`, otra v19 en `apps/frontend` para la app), causando `Cannot read properties of null (reading 'useState')`. `resolve.dedupe`/alias de Vite NO alcanzan porque Vitest externaliza esos paquetes (carga con `require` nativo). Fix real: `overrides` en el `package.json` de la raíz fijando `react`/`react-dom` a `^19.0.0` + reinstalar limpio (borrar `node_modules` + `package-lock.json`).
- **Gotcha real (cleanup de RTL):** sin `test.globals: true` en `vitest.config.ts`, Testing Library no detecta un framework global y no limpia el DOM solo entre tests — hay que llamar `afterEach(cleanup)` a mano en `vitest.setup.ts`, si no los renders de un test quedan pegados en el siguiente (`getByRole` empieza a fallar por "multiple elements found").
- **Gotcha real (workers de Vitest bajo presión de memoria):** si corrés `npm run dev` (servidores levantados) al mismo tiempo que la suite completa de tests, los forks de Vitest pueden morir con "Worker exited unexpectedly" / "Worker forks emitted error" por falta de RAM. Si pasa, correr con `npx vitest run --no-file-parallelism` (más lento pero estable), o cerrar los servidores de dev antes de testear.
- `useConexion` inicializa su estado leyendo `navigator.onLine` directo (no con `useState(true)` + corregir después) — evita un fetch de más en el primer render si se arranca offline.

## Agregar una nueva página al dashboard
1. Crear `src/app/(dashboard)/nombre/page.tsx`
2. Agregar el link al array `NAV` en `(dashboard)/layout.tsx`
3. Si necesita datos del servidor, agregar `useEffect` con `api.get()`
