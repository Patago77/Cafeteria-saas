import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyToken } from './jwt';

let io: Server;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    try {
      const payload = verifyToken(token);
      socket.data.tenantId = payload.tenantId;
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });

  io.on('connection', (socket) => {
    const { tenantId } = socket.data as { tenantId: string };
    socket.join(`tenant:${tenantId}`);
    socket.on('disconnect', () => {});
  });
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io no inicializado');
  return io;
}

export function emitPedidoActualizado(tenantId: string, pedido: unknown) {
  getIO().to(`tenant:${tenantId}`).emit('pedido:actualizado', pedido);
}
