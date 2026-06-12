import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'error' }]
      : [{ emit: 'stdout', level: 'error' }],
});

prisma.$on('query' as never, (e: { query: string; duration: number }) => {
  if (process.env.LOG_QUERIES === 'true') {
    logger.debug('Prisma query', { query: e.query, duration: e.duration });
  }
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
