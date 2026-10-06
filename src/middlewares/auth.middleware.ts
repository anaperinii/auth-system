import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { extractBearerToken, verifyAccessToken } from '../utils/jwt';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[4-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw AppError.unauthorized('Token de acesso não informado. Envie o cabeçalho Authorization: Bearer <token>.');
  }

  const payload = verifyAccessToken(token);
  const userId = payload.sub;

  if (!UUID_PATTERN.test(userId)) {
    throw AppError.unauthorized('Token inválido.');
  }

  req.user = { id: userId };

  next();
}
