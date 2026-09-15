#!/usr/bin/env node
/* fetch-new-logos.mjs — same method as the private monorepo's connector-catalog logo pipeline
 * (fuuz/accelerators/connector-catalog/logos/{fetch,download}-logos.cjs): pull each vendor's
 * official logo from its Wikipedia infobox image, for identification only (nominative use).
 * Writes real files under build/data/logos/vendor/ so pages <img> them rather than inlining
 * base64 — several of these (IFS Cloud etc, per the monorepo set) are hundreds of KB as a data
 * URI, which is fine once but not repeated across a dense logo grid. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const D = dirname(fileURLToPath(import.meta.url));

const VENDORS = [
  ['SugarCRM', 'SugarCRM'],
  ['Epicor', 'Epicor'],
  ['Acumatica', 'Acumatica'],
  ['Sage X3', 'Sage Group'],
  ['Shopify', 'Shopify'],
  ['Stripe', 'Stripe, Inc.'],
  ['DHL', 'DHL'],
  ['ETQ', 'ETQ (company)'],
  ['MasterControl', 'MasterControl'],
  ['Veeva Vault', 'Veeva Systems'],
  ['InfinityQS', 'InfinityQS'],
  ['Fiix', 'Fiix Software'],
  ['UpKeep', 'UpKeep'],
  ['MaintainX', 'MaintainX'],
];

async function api(params, attempt = 0) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  const r = await fetch(url, { headers: { 'User-Agent': 'fuuz-pages-logo-lookup/1.0 (internal reference tool; contact cscott@mfgx.io)' } });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch (e) {
    if (attempt < 4) { await new Promise(res => setTimeout(res, 3000 * (attempt + 1))); return api(params, attempt + 1); }
    throw new Error('non-JSON after retries: ' + text.slice(0, 120));
  }
}

async function findLogoFile(title) {
  const imgs = await api({ action: 'query', titles: title, prop: 'images', imlimit: '100' });
  const pages = imgs.query && imgs.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page.images) return null;
  const candidates = page.images.map(i => i.title)
    .filter(t => /logo/i.test(t) && !/wikimedia|commons-logo|wiki\.png/i.test(t));
  if (!candidates.length) return null;
  candidates.sort((a, b) => (/\.svg$/i.test(a) ? 0 : 1) - (/\.svg$/i.test(b) ? 0 : 1));
  return candidates[0];
}

const MIME = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };

(async () => {
  const manifest = {};
  for (const [name, wikiTitle] of VENDORS) {
    try {
      const fileTitle = await findLogoFile(wikiTitle);
      if (!fileTitle) { console.log(name.padEnd(16), '-> NOT FOUND (no logo image on', wikiTitle, ')'); continue; }
      const info = await api({ action: 'query', titles: fileTitle, prop: 'imageinfo', iiprop: 'url|mime' });
      const ipage = Object.values(info.query.pages)[0];
      if (!ipage.imageinfo) { console.log(name.padEnd(16), '-> NO IMAGEINFO'); continue; }
      const { url, mime } = ipage.imageinfo[0];
      const ext = url.split('.').pop().toLowerCase().split('?')[0];
      const r = await fetch(url, { headers: { 'User-Agent': 'fuuz-pages-logo-lookup/1.0 (internal; cscott@mfgx.io)' } });
      const buf = Buffer.from(await r.arrayBuffer());
      const fname = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.' + ext;
      writeFileSync(join(D, fname), buf);
      manifest[name] = { file: fname, source: fileTitle, mime: MIME[ext] || mime };
      console.log(name.padEnd(16), '->', fname, (buf.length / 1024).toFixed(1) + 'KB');
    } catch (e) {
      console.log(name.padEnd(16), '-> ERROR', e.message);
    }
    await new Promise(res => setTimeout(res, 1500));
  }
  writeFileSync(join(D, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone —', Object.keys(manifest).length, '/', VENDORS.length, 'resolved.');
})();
