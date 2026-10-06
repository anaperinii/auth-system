import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};

        for (const issue of error.issues) {
          const field = issue.path.join('.') || 'body';
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }

        next(AppError.badRequest('Dados inválidos.', fieldErrors));
        return;
      }

      next(error);
    }
  };
}
