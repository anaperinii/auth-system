import { createApp } from './app';
import { describeDatabase, env } from './config/env';
import { assertDatabaseConnection, closeDatabase } from './database/db';

async function bootstrap(): Promise<void> {
  try {
    await assertDatabaseConnection();
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    console.error(`Postgres (${describeDatabase()}): ${motivo}`);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log('');
    console.log('  auth.system');
    console.log(`  Servidor ........ http://localhost:${env.port}`);
    console.log(`  PostgreSQL ...... ${describeDatabase()}`);
    console.log('');
    console.log('  Rotas disponiveis:');
    console.log('    GET  /api/health              (pública)');
    console.log('    POST /api/auth/register       (pública)');
    console.log('    POST /api/auth/login          (pública)');
    console.log('    GET  /api/auth/me             (protegida)');
    console.log('    POST /api/auth/logout         (protegida)');
    console.log('    GET  /api/dashboard           (protegida)');
    console.log('');
  });

  const shutdown = (signal: string): void => {
    console.log(`\nRecebido ${signal}. Encerrando...`);

    server.close(() => {
      closeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });

    setTimeout(() => {
      console.error('Shutdown demorou demais. Encerrando a força.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  console.error('Falha fatal na inicialização:', error);
  process.exit(1);
});
