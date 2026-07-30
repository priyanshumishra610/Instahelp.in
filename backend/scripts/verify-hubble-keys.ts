/**
 * Verify that HUBBLE_PRIVATE_KEY matches HUBBLE_PUBLIC_KEY.
 * Usage: npx tsx scripts/verify-hubble-keys.ts
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const publicKeyPem = process.env.HUBBLE_PUBLIC_KEY?.replace(/\\n/g, '\n');
const privateKeyPem = process.env.HUBBLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const privateKeyPath = process.env.HUBBLE_PRIVATE_KEY_PATH;

function loadPrivateKey(): string | null {
  if (privateKeyPem) return privateKeyPem;
  if (privateKeyPath) {
    const fs = require('fs') as typeof import('fs');
    if (fs.existsSync(privateKeyPath)) return fs.readFileSync(privateKeyPath, 'utf8');
  }
  return null;
}

const privateKey = loadPrivateKey();

if (!publicKeyPem) {
  console.error('Set HUBBLE_PUBLIC_KEY in backend/.env');
  process.exit(1);
}

if (!privateKey) {
  console.error('Set HUBBLE_PRIVATE_KEY or HUBBLE_PRIVATE_KEY_PATH in backend/.env');
  console.error('The public key alone cannot sign JWT tokens - you need the matching private key.');
  process.exit(1);
}

try {
  const message = 'instahelp-hubble-key-check';
  const signature = crypto.sign('RSA-SHA256', Buffer.from(message), privateKey);
  const ok = crypto.verify('RSA-SHA256', Buffer.from(message), publicKeyPem, signature);

  if (ok) {
    console.log('Key pair matches. JWT SSO is ready to use.');
    process.exit(0);
  }

  console.error('Private key does NOT match the public key.');
  process.exit(1);
} catch (err) {
  console.error('Key verification failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
