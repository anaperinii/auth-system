import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const buckets = new Map<string, Bucket>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, options.windowMs);

  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'desconhecido';
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > options.max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));

      next(
        new AppError(
          options.message ?? `Muitas tentativas. Tente novamente em ${retryAfterSeconds} segundos.`,
          429,
          'TOO_MANY_REQUESTS',
        ),
      );
      return;
    }

    next();
  };
}
