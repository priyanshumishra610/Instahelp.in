#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', 'image', 'shop');

const TARGETS = [
  ['meesho', 'meesho.com'],
  ['dunzo', 'dunzo.in'],
  ['bigbasket', 'bigbasket.com'],
  ['milkbasket', 'milkbasket.com'],
  ['licious', 'licious.in'],
  ['sephora', 'sephora.nnnow.com'],
  ['reliancedigital', 'reliancedigital.in'],
  ['vijaysales', 'vijaysales.com'],
  ['oneplus', 'oneplus.in'],
  ['lenovo', 'lenovo.com'],
  ['snitch', 'snitch.co.in'],
  ['fabindia', 'fabindia.com'],
  ['urbanladder', 'urbanladder.com'],
  ['wakefit', 'wakefit.co'],
  ['duroflex', 'duroflexworld.com'],
  ['sleepyhead', 'sleepyheadhome.com'],
  ['nilkamal', 'nilkamalfurniture.com'],
  ['melorra', 'melorra.com'],
  ['campus', 'campusshoes.com'],
  ['firstcry', 'firstcry.com'],
  ['babyoye', 'babyoye.com'],
  ['irctc', 'irctc.co.in'],
  ['pvr', 'pvr.in'],
  ['naturesbasket', 'naturesbasket.co.in'],
  ['spencers', 'spencers.in'],
  ['sugar', 'sugarcosmetics.com'],
  ['minimalist', 'beminimalist.co'],
  ['trawel', 'trawel.in'],
  ['goibibo', 'goibibo.com'],
  ['yatra', 'yatra.com'],
  ['cleartrip', 'cleartrip.com'],
  ['easemytrip', 'easemytrip.com'],
  ['agoda', 'agoda.com'],
  ['indigo', 'goindigo.in'],
  ['booking', 'booking.com'],
  ['airbnb', 'airbnb.co.in'],
  ['hopscotch', 'hopscotch.in'],
  ['hamleys', 'hamleys.in'],
  ['mothercare', 'mothercare.in'],
  ['joyalukkas', 'joyalukkas.in'],
  ['candere', 'candere.com'],
  ['underarmour', 'underarmour.co.in'],
  ['reebok', 'reebok.in'],
  ['medplus', 'medplusmart.com'],
  ['truemeds', 'truemeds.in'],
  ['practo', 'practo.com'],
  ['livspace', 'livspace.com'],
  ['homecentre', 'homecentre.in'],
  ['dotandkey', 'dotandkey.com'],
  ['purplle', 'purplle.com'],
  ['snapdeal', 'snapdeal.com'],
  ['amazon', 'amazon.in'],
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return get(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(String(res.statusCode))); }
      const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => resolve(Buffer.concat(c)));
    }).on('error', reject);
  });
}

function valid(buf) {
  if (!buf || buf.length < 180) return false;
  const t = buf.slice(0, 20).toString('utf8');
  if (t.includes('<!') || t.includes('<html')) return false;
  return (buf[0] === 0x89 || buf[0] === 0xff || buf.toString('ascii', 0, 4) === 'RIFF');
}

function quality(buf) {
  if (!valid(buf)) return 0;
  if (buf[0] === 0x89 && buf.length > 24) {
    return buf.readUInt32BE(16) * buf.readUInt32BE(20) + buf.length;
  }
  return buf.length * 2;
}

async function fetchOne(id, domain) {
  const urls = [
    'https://www.' + domain + '/apple-touch-icon.png',
    'https://' + domain + '/apple-touch-icon.png',
    'https://www.' + domain + '/favicon-192x192.png',
    'https://logo.clearbit.com/' + domain + '?size=128',
    'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=256',
    'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://' + domain + '&size=128',
  ];
  let best = null, bestQ = 0, src = '';
  for (const u of urls) {
    try {
      const buf = await get(u);
      const q = quality(buf);
      if (q > bestQ) { bestQ = q; best = buf; src = u; }
    } catch (e) { /* continue */ }
  }
  if (!best) return { id, ok: false };
  fs.writeFileSync(path.join(OUT, id + '.png'), best);
  return { id, ok: true, q: bestQ, bytes: best.length, src };
}

(async () => {
  const results = await Promise.all(TARGETS.map(([id, d]) => fetchOne(id, d)));
  results.forEach((r) => console.log(r.ok ? 'OK' : 'FAIL', r.id, r.ok ? r.bytes + 'b' : ''));
  console.log('failed:', results.filter((r) => !r.ok).map((r) => r.id).join(', ') || 'none');
})();
