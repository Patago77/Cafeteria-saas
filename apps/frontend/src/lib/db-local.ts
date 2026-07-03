import { openDB } from 'idb';

const DB_NAME = 'cafeteria-saas';
const DB_VERSION = 1;

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pedidos')) {
        db.createObjectStore('pedidos', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cola_sync')) {
        db.createObjectStore('cola_sync', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function guardarPedidoLocal(pedido: unknown) {
  const db = await getDB();
  const fechaLocal = new Date().toISOString();
  const id = await db.add('pedidos', { ...(pedido as object), fechaLocal });
  await db.add('cola_sync', { tipo: 'crear_pedido', datos: pedido, fechaLocal });
  return { ...(pedido as object), id, fechaLocal };
}

export async function getPedidosLocales() {
  const db = await getDB();
  return db.getAll('pedidos');
}

export async function getColaSyncPendiente() {
  const db = await getDB();
  return db.getAll('cola_sync');
}

export async function eliminarDeColaSyncPor(id: number) {
  const db = await getDB();
  await db.delete('cola_sync', id);
}
