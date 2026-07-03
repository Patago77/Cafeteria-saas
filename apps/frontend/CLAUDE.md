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
- Cobertura actual: `stores/pedido.store.ts`, `hooks/useConexion.ts`, `hooks/usePedidos.ts` (mockeando `@/lib/api` con `vi.mock` + `vi.hoisted`), `lib/api.ts` (token/headers/manejo de errores), `lib/db-local.ts` (con `fake-indexeddb`). Todavía sin cobertura: páginas del dashboard (toda la lógica vive inline en los `page.tsx`, no hay tests de componente todavía), `useSocket.ts`, onboarding.
- **Gotcha real que nos costó tiempo:** el monorepo tenía DOS copias de React instaladas (una v18 hoisteada a la raíz por `@testing-library/react`, otra v19 en `apps/frontend` para la app). Node resuelve cada una según quién la pida, así que un componente terminaba usando los internals de una copia de React mientras react-dom usaba la otra → `Cannot read properties of null (reading 'useState')`. `resolve.dedupe`/alias de Vite NO alcanzan para arreglarlo porque Vitest externaliza esos paquetes (los carga con `require` nativo, sin pasar por el resolver de Vite). El fix real fue agregar `overrides` en el `package.json` de la raíz fijando `react`/`react-dom` a `^19.0.0` y reinstalar limpio (borrar `node_modules` + `package-lock.json`).
- **Gap real encontrado (no arreglado, documentado en el test):** `useConexion` arranca siempre con `online=true` (default de `useState`) y recién lo corrige a `navigator.onLine` en un `useEffect`. Esto significa que en el primer render, cualquier hook que dependa de `online` (como `usePedidos`) puede disparar una llamada a la API de más incluso arrancando offline. Inofensivo en la práctica (el error se traga con `.catch`), pero vale la pena corregir inicializando el estado con `navigator.onLine` directamente si se retoma este hook.

## Agregar una nueva página al dashboard
1. Crear `src/app/(dashboard)/nombre/page.tsx`
2. Agregar el link al array `NAV` en `(dashboard)/layout.tsx`
3. Si necesita datos del servidor, agregar `useEffect` con `api.get()`
