import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(cors());

  app.use(express.json({ limit: '10kb' }));

  const frontend = path.resolve(process.cwd(), 'web', 'dist');

  app.use(express.static(frontend));

  app.get('/', (_req, res, next) => {
    if (fs.existsSync(path.join(frontend, 'index.html'))) {
      next();
      return;
    }

    res.status(503).type('text/plain; charset=utf-8').send(
      [
        'O front-end ainda não foi compilado.',
        '',
        'Rode:  npm run web:build',
        '',
        'Para desenvolver a interface com recarregamento automático,',
        'use `npm run web:dev` (Vite em http://localhost:5173, com proxy',
        'das chamadas /api para este servidor).',
        '',
        'A API em si não depende disso e já esta no ar:',
        '  GET  /api/health',
        '  GET  /api/docs      (documentação interativa)',
      ].join('\n'),
    );
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
