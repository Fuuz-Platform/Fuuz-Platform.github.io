/*
 * Builds site/pagefind using Pagefind's Node API rather than its CLI.
 *
 * The CLI (`pagefind --site site`) can only produce one result per physical HTML file. That
 * collapses every accelerator card on the homepage into a single "/" result: searching "MES"
 * pointed at the whole homepage instead of at the MES accelerator's own site or repo. The card
 * grids are marked data-pagefind-ignore (see build/generate.mjs) so the ordinary page crawl skips
 * them, and addCustomRecord below gives each accelerator its own result with its own real
 * destination — the same URL its card already links to.
 *
 * Depends on build/generate.mjs having already run: it reads the list that step wrote to
 * build/search-records.json.
 */
import * as pagefind from 'pagefind';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', 'site');

function check(result, step) {
  if (result?.errors?.length) throw new Error(`${step}: ${result.errors.join('\n')}`);
  return result;
}

const { index } = check(await pagefind.createIndex(), 'createIndex');

const { page_count } = check(await index.addDirectory({ path: SITE }), 'addDirectory');

const records = JSON.parse(readFileSync(join(HERE, 'search-records.json'), 'utf8'));
for (const r of records) {
  check(
    await index.addCustomRecord({ url: r.url, content: r.content, language: 'en', meta: { title: r.title } }),
    `addCustomRecord(${r.url})`
  );
}

check(await index.writeFiles({ outputPath: join(SITE, 'pagefind') }), 'writeFiles');

console.log(`Indexed ${page_count} pages and ${records.length} accelerator records.`);
await pagefind.close();
