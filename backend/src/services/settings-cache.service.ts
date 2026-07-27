import { AppSettings } from '@prisma/client';
import { prisma } from '../config/database';

const TTL_MS = 60_000;

let cached: AppSettings | null = null;
let cachedAt = 0;

export async function getCachedAppSettings(): Promise<AppSettings> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;

  const settings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {},
    update: {},
  });

  cached = settings;
  cachedAt = now;
  return settings;
}

export function invalidateAppSettingsCache(): void {
  cached = null;
  cachedAt = 0;
}
