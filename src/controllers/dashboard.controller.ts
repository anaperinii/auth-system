import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../errors/AppError';

export const dashboardController = {
  async show(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      message: `Bem-vindo(a), ${user.name}! Este conteúdo apenas aparece para usuários autenticados.`,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          memberSince: user.createdAt,
        },
        serverTime: new Date().toISOString(),
      },
    });
  },
};
