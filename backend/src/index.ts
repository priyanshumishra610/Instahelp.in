import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env, assertProductionDatabaseUrl } from './config/env';
import { logger } from './config/logger';

async function main() {
  assertProductionDatabaseUrl();
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`InstaHelp API running on ${env.API_BASE_URL} (port ${env.PORT})`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Frontend URL: ${env.FRONTEND_URL}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
