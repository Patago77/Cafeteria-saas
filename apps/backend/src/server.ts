import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initSocket } from './lib/socket';
import { errorHandler } from './middlewares/errorHandler';

import authRouter from './routes/auth';
import onboardingRouter from './routes/onboarding';
import pedidosRouter from './routes/pedidos';
import productosRouter from './routes/productos';
import cajaRouter from './routes/caja';
import empleadosRouter from './routes/empleados';
import webhooksRouter from './routes/webhooks';

const app = express();
const httpServer = createServer(app);

initSocket(httpServer);

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/productos', productosRouter);
app.use('/api/caja', cajaRouter);
app.use('/api/empleados', empleadosRouter);
app.use('/api/webhooks', webhooksRouter);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
