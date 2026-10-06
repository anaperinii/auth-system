import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../errors/AppError';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput);

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso.',
      data: result,
    });
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput);

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso.',
      data: result,
    });
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      message: `Área restrita. Você está autenticado como ${user.name}.`,
      data: { user },
    });
  },

  logout(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      message: 'Logout efetuado. Descarte o token no cliente.',
    });
  },
};
