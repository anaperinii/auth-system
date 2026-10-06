import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { dashboardController } from '../controllers/dashboard.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { docsRoutes } from '../docs/docs.routes';
import { noStore } from '../middlewares/noStore.middleware';

export const routes = Router();

routes.use(noStore);

routes.use('/', docsRoutes);

routes.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
});

routes.use('/auth', authRoutes);

routes.get('/dashboard', requireAuth, dashboardController.show);
