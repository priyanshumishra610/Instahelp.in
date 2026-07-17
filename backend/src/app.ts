import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { corsOrigins } from './config/env';
import { globalRateLimiter } from './middleware/rateLimit';
import { sanitizeInput } from './middleware/sanitizeInput';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import { prisma } from './config/database';
import { logger } from './config/logger';

function isAllowedCorsOrigin(origin: string): boolean {
  if (corsOrigins.includes('*') || corsOrigins.includes(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+--)?[a-z0-9-]+\.netlify\.(app|live)$/i.test(origin)) return true;
  return false;
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || isAllowedCorsOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
      credentials: true,
    })
  );

  app.use(globalRateLimiter);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(sanitizeInput);

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'instahelp-backend',
      });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });

  app.use('/api', apiRoutes);

  function resolveFrontendPath(): string {
    if (process.env.STATIC_ROOT) {
      return path.resolve(process.env.STATIC_ROOT);
    }

    const candidates = [
      path.join(__dirname, '../../public'),
      path.join(__dirname, '../../'),
      path.join(process.cwd(), 'public'),
      path.join(process.cwd(), '..', 'public'),
      path.join(process.cwd(), '..'),
      path.join(process.cwd()),
    ];

    for (const dir of candidates) {
      if (fs.existsSync(path.join(dir, 'index.html'))) {
        return dir;
      }
    }

    return path.join(__dirname, '../../');
  }

  const frontendPath = resolveFrontendPath();
  const indexPath = path.join(frontendPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    logger.info(`Serving frontend from ${frontendPath}`);
  } else {
    logger.error(`Frontend not found — index.html missing at ${indexPath}`);
  }

  function sendPage(res: express.Response, next: express.NextFunction, file: string): void {
    const absolute = path.join(frontendPath, file);
    res.sendFile(absolute, (err) => {
      if (err) {
        logger.error(`Failed to send ${file}`, { path: absolute, error: err.message });
        next(err);
      }
    });
  }

  const htmlPages: Record<string, string> = {
    '/plans': 'plans.html',
    '/pay': 'pay.html',
    '/orders': 'orders.html',
    '/transactions': 'transactions.html',
    '/admin-payment': 'admin-payment.html',
    '/payment-success': 'payment-success.html',
    '/payment-failed': 'payment-failed.html',
    '/pricing': 'pricing.html',
    '/giftcards': 'giftcards.html',
    '/app-waitlist': 'app-waitlist.html',
  };

  for (const [route, file] of Object.entries(htmlPages)) {
    app.get(route, (_req, res, next) => {
      sendPage(res, next, file);
    });
    app.get(`${route}.html`, (_req, res) => {
      res.redirect(301, route);
    });
  }

  app.use(express.static(frontendPath));

  app.get('/', (_req, res, next) => {
    sendPage(res, next, 'index.html');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
