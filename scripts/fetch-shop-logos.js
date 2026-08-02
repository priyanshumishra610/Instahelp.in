#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'image', 'shop');
const SHOP_JS = path.join(ROOT, 'js', 'shop.js');
const CONCURRENCY = 8;

function fetchUrl(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 8000,
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 4) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        fetchUrl(next, redirects + 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(String(res.statusCode)));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

function domainFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
}

function parseStores(source) {
  const stores = [];
  const re = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']*)',\s*url:\s*'([^']+)'[^}]*category:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(source))) {
    const entry = { id: m[1], url: m[3], category: m[4] };
    if (entry.category === entry.id) continue;
    const logoMatch = m[0].match(/logo:\s*'([^']+)'/);
    entry.logo = logoMatch ? logoMatch[1] : entry.id + '.png';
    if (!entry.logo.endsWith('.svg')) stores.push(entry);
  }
  return stores;
}

function isImage(buf) {
  if (!buf || buf.length < 200) return false;
  const h = buf.slice(0, 16).toString('binary');
  if (h.includes('<!DOCTYPE') || h.includes('<html') || h.includes('<?xml')) return false;
  return (
    (buf[0] === 0x89 && buf[1] === 0x50) ||
    (buf[0] === 0xff && buf[1] === 0xd8) ||
    buf.toString('ascii', 0, 4) === 'RIFF'
  );
}

function score(buf) {
  if (!isImage(buf)) return 0;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf.length > 24) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w >= 48 && h >= 48) return w * h + buf.length;
  }
  return buf.length;
}

async function fetchBestLogo(store) {
  const domain = domainFromUrl(store.url);
  const urls = [
    'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=256',
    'https://logo.clearbit.com/' + domain + '?size=128',
    'https://www.' + domain + '/apple-touch-icon.png',
    'https://' + domain + '/apple-touch-icon.png',
  ];

  let best = null;
  let bestScore = 0;
  for (const url of urls) {
    try {
      const buf = await fetchUrl(url);
      const s = score(buf);
      if (s > bestScore) {
        bestScore = s;
        best = buf;
      }
    } catch (e) { /* next */ }
  }

  if (!best || bestScore < 500) {
    return { id: store.id, ok: false, domain };
  }
  fs.writeFileSync(path.join(OUT_DIR, store.id + '.png'), best);
  return { id: store.id, ok: true, bytes: best.length, domain };
}

async function runPool(items, worker, limit) {
  const results = [];
  let i = 0;
  async function next() {
    const idx = i++;
    if (idx >= items.length) return;
    results[idx] = await worker(items[idx]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

async function main() {
  const stores = parseStores(fs.readFileSync(SHOP_JS, 'utf8'));
  console.log('Fetching', stores.length, 'logos (concurrency', CONCURRENCY + ')...');
  const results = await runPool(stores, fetchBestLogo, CONCURRENCY);
  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log('OK:', ok.length, 'Failed:', fail.length);
  if (fail.length) console.log(fail.map((f) => f.id).join(', '));
}

main();
