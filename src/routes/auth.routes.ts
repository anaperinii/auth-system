import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { rateLimit } from '../middlewares/rateLimit.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Muitas tentativas de cadastro. Aguarde alguns minutos.' }),
  validateBody(registerSchema),
  authController.register,
);

authRoutes.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Muitas tentativas de login. Aguarde alguns minutos.' }),
  validateBody(loginSchema),
  authController.login,
);

authRoutes.get('/me', requireAuth, authController.me);

authRoutes.post('/logout', requireAuth, authController.logout);
