import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
}

export function signAccessToken(user: { id: string }): string {
  const payload = {};

  const options: SignOptions = {
    subject: user.id,
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
    issuer: 'auth.system',
    algorithm: 'HS256',
  };

  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      issuer: 'auth.system',
      algorithms: ['HS256'],
    });

    if (typeof decoded === 'string' || !decoded.sub) {
      throw AppError.unauthorized('Token com formato inválido.');
    }

    return decoded as AccessTokenPayload;
  } catch (error) {
    if (error instanceof AppError) throw error;

    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Sessão expirada. Faça login novamente.');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('Token inválido.');
    }

    throw AppError.unauthorized('Não foi possível validar o token.');
  }
}

export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim();
}
